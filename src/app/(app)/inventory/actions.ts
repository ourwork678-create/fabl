"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
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

  await prisma.inventoryItem.create({
    data: {
      name,
      type,
      unit,
      currentStock,
      minStock,
      saleRate,
    },
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export async function adjustStock(itemId: string, formData: FormData) {
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
    const delta = direction === "IN" ? quantity : -quantity;
    const newBalance = Number(item.currentStock) + delta;

    await tx.inventoryItem.update({
      where: { id: itemId },
      data: { currentStock: { increment: delta } },
    });

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
