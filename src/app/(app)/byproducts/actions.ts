"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { genReceiptNo, round2, withRetry, todayLocalISO } from "@/lib/utils";

export async function createByproductSale(formData: FormData) {
  await requireUser();

  const customerId = formData.get("customerId") as string;
  const newCustomerName = formData.get("newCustomerName") as string;
  const byproductName = ((formData.get("byproductName") as string) || "গুঁড়া").trim();
  const quantity = Number(formData.get("quantity"));
  const rate = Number(formData.get("rate"));
  const paidAmount = Number(formData.get("paidAmount") || 0);
  const dateStr = (formData.get("date") as string) || todayLocalISO();
  const notes = formData.get("notes") as string;

  if (!(quantity > 0)) throw new Error("সঠিক পরিমাণ লিখুন");
  if (!(rate > 0)) throw new Error("সঠিক দর/দাম লিখুন");
  if (paidAmount < 0 || Number.isNaN(paidAmount)) throw new Error("পরিশোধিত টাকা সঠিক নয়");

  let targetCustomerId = customerId;
  if (!targetCustomerId && newCustomerName) {
    const cust = await prisma.customer.create({
      data: { name: newCustomerName },
    });
    targetCustomerId = cust.id;
  }
  if (!targetCustomerId) {
    let defaultCust = await prisma.customer.findFirst({ where: { name: "নগদ উপজাত ক্রেতা" } });
    if (!defaultCust) {
      defaultCust = await prisma.customer.create({ data: { name: "নগদ উপজাত ক্রেতা" } });
    }
    targetCustomerId = defaultCust.id;
  }

  // নির্দিষ্ট নামের BYPRODUCT আইটেম খুঁজি (substring ম্যাচ এড়িয়ে ভুল আইটেম থেকে স্টক কাটা)
  let existingItem = await prisma.inventoryItem.findFirst({
    where: { name: byproductName, type: "BYPRODUCT" },
  });

  if (!existingItem) {
    existingItem = await prisma.inventoryItem.create({
      data: {
        name: byproductName,
        type: "BYPRODUCT",
        unit: "বস্তা",
        currentStock: 0,
      },
    });
  }

  const targetItemId = existingItem.id;
  const subtotal = round2(quantity * rate);
  const total = subtotal;
  if (paidAmount > total) throw new Error("পরিশোধিত টাকা মোটের চেয়ে বেশি হতে পারবে না");
  const paid = round2(paidAmount);
  const due = round2(total - paid);
  const status = due <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";

  await withRetry(async () => {
    const receiptNo = genReceiptNo("BYP", dateStr);
  await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: targetItemId } });
    // স্টক পর্যাপ্ত কিনা যাচাই
    if (Number(item.currentStock) < quantity) {
      throw new Error(`${item.name} এর স্টক পর্যাপ্ত নয় (আছে ${item.currentStock})`);
    }

    const sale = await tx.sale.create({
      data: {
        receiptNo,
        date: new Date(dateStr),
        customerId: targetCustomerId,
        subtotal,
        discount: 0,
        totalAmount: total,
        paidAmount: paid,
        dueAmount: due,
        status,
        notes: notes || `উপজাত (${byproductName}) বিক্রি`,
        items: {
          create: [
            {
              itemId: targetItemId,
              quantity,
              rate,
              amount: total,
            },
          ],
        },
      },
    });

    // স্টক আউট + লেজার (refId সহ, যাতে মুছলে মুভমেন্টও মুছে যায়)
    const newBal = round2(Number(item.currentStock) - quantity);
    await tx.inventoryItem.update({
      where: { id: targetItemId },
      data: { currentStock: { decrement: quantity } },
    });
    await tx.stockMovement.create({
      data: {
        itemId: targetItemId,
        direction: "OUT",
        quantity,
        balance: newBal,
        refType: "SALE",
        refId: sale.id,
        note: "উপজাত বিক্রি",
      },
    });

    if (due > 0) {
      await tx.customer.update({
        where: { id: targetCustomerId },
        data: { dueAmount: { increment: due } },
      });
    }
  });
  });

  revalidatePath("/byproducts");
  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}
