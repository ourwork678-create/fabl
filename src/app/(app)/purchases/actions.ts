"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { genReceiptNo, round2, withRetry } from "@/lib/utils";

type LineItem = { itemId: string; quantity: number; rate: number };

export async function createPurchase(input: {
  supplierId: string;
  date: string;
  discount: number;
  paidAmount: number;
  notes?: string;
  items: LineItem[];
}) {
  await requireUser();

  if (!input.supplierId) throw new Error("সাপ্লায়ার নির্বাচন করুন");
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
    const receiptNo = genReceiptNo("PUR", input.date);
    await prisma.$transaction(async (tx) => {
      // একই পণ্য একাধিক লাইনে থাকলে পরিমাণ একত্রিত করা
      const qtyByItem = new Map<string, number>();
      for (const it of input.items) {
        qtyByItem.set(it.itemId, round2((qtyByItem.get(it.itemId) || 0) + it.quantity));
      }

      const purchase = await tx.purchase.create({
        data: {
          receiptNo,
          date: new Date(input.date),
          supplierId: input.supplierId,
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

      // স্টক ইন + লেজার (অ্যাটমিক increment)
      for (const [itemId, qty] of qtyByItem) {
        const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
        const newBal = round2(Number(item.currentStock) + qty);
        await tx.inventoryItem.update({
          where: { id: itemId },
          data: { currentStock: { increment: qty } },
        });
        await tx.stockMovement.create({
          data: {
            itemId,
            direction: "IN",
            quantity: qty,
            balance: newBal,
            refType: "PURCHASE",
            refId: purchase.id,
          },
        });
      }

      // সাপ্লায়ার বকেয়া আপডেট
      if (due > 0) {
        await tx.supplier.update({
          where: { id: input.supplierId },
          data: { dueAmount: { increment: due } },
        });
      }
    });
  });

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export async function deletePurchase(id: string) {
  await requireUser();
  await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });
    // স্টক ফেরত
    for (const it of purchase.items) {
      await tx.inventoryItem.update({
        where: { id: it.itemId },
        data: { currentStock: { decrement: Number(it.quantity) } },
      });
    }
    // বর্তমান (পেমেন্ট-পরবর্তী) বকেয়া কমানো (সুরক্ষিত চেক)
    const purchaseDue = Number(purchase.dueAmount);
    if (purchaseDue > 0) {
      const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: purchase.supplierId } });
      const currentSupplierDue = Number(supplier.dueAmount);
      const dueToDecrement = Math.min(currentSupplierDue, purchaseDue);
      if (dueToDecrement > 0) {
        await tx.supplier.update({
          where: { id: purchase.supplierId },
          data: { dueAmount: { decrement: dueToDecrement } },
        });
      }
    }
    await tx.purchase.delete({ where: { id } });
    await tx.stockMovement.deleteMany({ where: { refType: "PURCHASE", refId: id } });
  });

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}
