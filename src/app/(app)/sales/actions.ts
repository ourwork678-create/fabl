"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { genReceiptNo, round2, withRetry, parseDateLocal } from "@/lib/utils";

type LineItem = { itemId: string; quantity: number; rate: number };

export async function createSale(input: {
  customerId: string;
  date: string;
  discount: number;
  paidAmount: number;
  notes?: string;
  items: LineItem[];
}) {
  await requireUser();

  if (!input.customerId) throw new Error("কাস্টমার নির্বাচন করুন");
  if (!input.items.length) throw new Error("অন্তত একটি পণ্য যোগ করুন");

  const discount = input.discount || 0;
  if (discount < 0) throw new Error("ছাড় সঠিক নয়");
  const paid = input.paidAmount || 0;
  if (paid < 0) throw new Error("পরিশোধিত টাকা সঠিক নয়");

  for (const it of input.items) {
    if (typeof it.quantity !== "number" || !Number.isFinite(it.quantity) || it.quantity <= 0) {
      throw new Error("পরিমাণ সঠিক নয় (শূন্যের চেয়ে বেশি হবে)");
    }
    if (typeof it.rate !== "number" || !Number.isFinite(it.rate) || it.rate < 0) {
      throw new Error("দর সঠিক নয়");
    }
  }

  const subtotal = round2(input.items.reduce((s, it) => s + it.quantity * it.rate, 0));
  if (discount > subtotal) throw new Error("ছাড় উপমোটের চেয়ে বেশি হতে পারবে না");
  const total = round2(subtotal - discount);
  if (paid > total) throw new Error("পরিশোধিত টাকা মোটের চেয়ে বেশি হতে পারবে না");
  const due = round2(total - paid);
  const status = due <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";

  await withRetry(async () => {
    const receiptNo = genReceiptNo("SAL", input.date);
    await prisma.$transaction(async (tx) => {
      // একই পণ্য একাধিক লাইনে থাকলে পরিমাণ একত্রিত করে স্টক যাচাই
      const needByItem = new Map<string, number>();
      for (const it of input.items) {
        needByItem.set(it.itemId, round2((needByItem.get(it.itemId) || 0) + it.quantity));
      }
      for (const [itemId, need] of needByItem) {
        const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
        if (Number(item.currentStock) < need) {
          throw new Error(`${item.name} এর স্টক পর্যাপ্ত নয় (আছে ${item.currentStock})`);
        }
      }

      const sale = await tx.sale.create({
        data: {
          receiptNo,
          date: parseDateLocal(input.date),
          customerId: input.customerId,
          subtotal,
          discount,
          totalAmount: total,
          paidAmount: paid,
          dueAmount: due,
          status,
          notes: input.notes || null,
          items: {
            create: input.items.map((it) => ({
              itemId: it.itemId,
              quantity: it.quantity,
              rate: it.rate,
              amount: round2(it.quantity * it.rate),
            })),
          },
        },
      });

      // স্টক আউট + লেজার (অ্যাটমিক decrement)
      for (const [itemId, qty] of needByItem) {
        // অ্যাটমিক শর্তসাপেক্ষ ডিক্রিমেন্ট — একসাথে দুটি লেনদেনেও স্টক ঋণাত্মক হবে না
        const guarded = await tx.inventoryItem.updateMany({
          where: { id: itemId, currentStock: { gte: qty } },
          data: { currentStock: { decrement: qty } },
        });
        if (guarded.count === 0) throw new Error("স্টক পর্যাপ্ত নয় (একই সময়ে অন্য লেনদেনে স্টক বদলে গেছে)");
        const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
        const newBal = round2(Number(item.currentStock));
        await tx.stockMovement.create({
          data: {
            itemId,
            direction: "OUT",
            quantity: qty,
            balance: newBal,
            refType: "SALE",
            refId: sale.id,
          },
        });
      }

      // কাস্টমার বকেয়া
      if (due > 0) {
        await tx.customer.update({
          where: { id: input.customerId },
          data: { dueAmount: { increment: due } },
        });
      }
    });
  });

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export async function deleteSale(id: string) {
  await requireUser();
  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });
    for (const it of sale.items) {
      await tx.inventoryItem.update({
        where: { id: it.itemId },
        data: { currentStock: { increment: Number(it.quantity) } },
      });
    }
    // বর্তমান (পেমেন্ট-পরবর্তী) বকেয়া কমানো (সুরক্ষিত চেক)
    const saleDue = Number(sale.dueAmount);
    if (saleDue > 0) {
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: sale.customerId } });
      const currentCustomerDue = Number(customer.dueAmount);
      const dueToDecrement = Math.min(currentCustomerDue, saleDue);
      if (dueToDecrement > 0) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { dueAmount: { decrement: dueToDecrement } },
        });
      }
    }
    await tx.sale.delete({ where: { id } });
    await tx.stockMovement.deleteMany({ where: { refType: "SALE", refId: id } });
    // এই বিক্রয়ের পেমেন্ট-বরাদ্দ রেকর্ড পরিষ্কার (ভবিষ্যতে পেমেন্ট মুছলে ভুতুড়ে ফেরত এড়াতে)
    await tx.paymentAllocation.deleteMany({ where: { docType: "SALE", docId: id } });
  });

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}
