"use server";

import { runAction } from "@/lib/action-result";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { round2 } from "@/lib/utils";
import { ITEM_TYPES } from "@/lib/constants";
import { Prisma } from "@prisma/client";

export async function createInventoryItem(formData: FormData) {
  await requireUser();
  const name = (formData.get("name") as string)?.trim();
  const type = formData.get("type") as string;
  const unit = (formData.get("unit") as string)?.trim() || "মণ";
  const currentStock = num(formData.get("currentStock"));
  const minStock = num(formData.get("minStock"));
  const saleRate = numOrNull(formData.get("saleRate"));

  if (!name) throw new Error("নাম দিন");
  if (!ITEM_TYPES.includes(type as any)) throw new Error("সঠিক ধরন দিন");
  if (currentStock < 0) throw new Error("প্রারম্ভিক স্টক ঋণাত্মক হতে পারবে না");
  if (minStock < 0) throw new Error("ন্যূনতম স্টক ঋণাত্মক হতে পারবে না");

  await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.create({
      data: {
        name,
        type,
        unit,
        currentStock,
        minStock,
        saleRate,
      },
    });
    // প্রারম্ভিক স্টক থাকলে খতিয়ানেও এন্ট্রি — নাহলে মুভমেন্টের যোগফল স্টকের সাথে মিলত না
    if (currentStock > 0) {
      await tx.stockMovement.create({
        data: {
          itemId: item.id,
          direction: "IN",
          quantity: currentStock,
          balance: currentStock,
          refType: "ADJUSTMENT",
          note: "প্রারম্ভিক স্টক",
        },
      });
    }
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export async function adjustStock(itemId: string, formData: FormData) {
  return runAction(async () => {
    await requireUser();
    const direction = formData.get("direction") as string; // IN | OUT
    const quantity = num(formData.get("quantity"));
    const note = (formData.get("note") as string)?.trim() || null;

    if (!quantity || quantity <= 0) throw new Error("পরিমাণ সঠিক নয়");
    if (!["IN", "OUT"].includes(direction)) throw new Error("দিক সঠিক নয়");

    await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
      if (direction === "OUT" && Number(item.currentStock) < quantity) {
        throw new Error("স্টক পর্যাপ্ত নয়");
      }
      if (direction === "OUT") {
        const guarded = await tx.inventoryItem.updateMany({ where: { id: itemId, currentStock: { gte: quantity } }, data: { currentStock: { decrement: quantity } } });
        if (guarded.count === 0) throw new Error("স্টক পর্যাপ্ত নয় (একই সময়ে অন্য লেনদেনে স্টক বদলে গেছে)");
      } else {
        await tx.inventoryItem.update({ where: { id: itemId }, data: { currentStock: { increment: quantity } } });
      }
      const after = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
      const newBalance = round2(Number(after.currentStock));

      await tx.stockMovement.create({
        data: {
          itemId,
          direction,
          quantity,
          balance: newBalance,
          refType: "ADJUSTMENT",
          note,
        },
      });
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
  });
}

export async function deleteInventoryItem(itemId: string) {
  await requireUser();
  try {
    await prisma.inventoryItem.delete({ where: { id: itemId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      throw new Error("এই পণ্য লেনদেনে ব্যবহৃত হয়েছে, মুছা যাবে না");
    }
    throw e;
  }
  revalidatePath("/inventory");
}

function num(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? "0"));
  return Number.isNaN(n) ? 0 : n;
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  if (!v) return null;
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}
