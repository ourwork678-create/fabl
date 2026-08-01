"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { genReceiptNo, round2, withRetry, parseDateLocal } from "@/lib/utils";
import { ITEM_TYPES } from "@/lib/constants";

export async function createBatch(input: {
  machineId?: string;
  operatorId?: string;
  date: string;
  notes?: string;
  inputs: { itemId: string; quantity: number }[];
  outputs: { itemId: string; quantity: number }[];
  recoveryRate?: number;
}) {
  const session = await requireUser();
  if (!input.inputs.length) throw new Error("অন্তত একটি ইনপুট (ধান) দিন");

  for (const it of input.inputs) {
    if (!(it.quantity > 0)) throw new Error("ইনপুট পরিমাণ সঠিক নয় (শূন্যের চেয়ে বেশি হবে)");
  }
  // অবৈধ (শূন্য/ঋণাত্মক) আউটপুট বাদ দিয়ে শুধু বৈধগুলো রাখি
  const validOutputs = input.outputs.filter((o) => o.quantity > 0);

  await withRetry(async () => {
    const batchNo = genReceiptNo("BAT", input.date);

  await prisma.$transaction(async (tx) => {
    // একই আইটেম একাধিক লাইনে থাকলে পরিমাণ একত্রিত করা (নাহলে প্রতি লাইনে আলাদা চেক
    // পাস করে গিয়ে মোট ডিক্রিমেন্টে স্টক ঋণাত্মক হয়ে যেত)
    const needByItem = new Map<string, number>();
    for (const it of input.inputs) {
      needByItem.set(it.itemId, round2((needByItem.get(it.itemId) || 0) + it.quantity));
    }
    const outByItem = new Map<string, number>();
    for (const it of validOutputs) {
      outByItem.set(it.itemId, round2((outByItem.get(it.itemId) || 0) + it.quantity));
    }

    // স্টক চেক ইনপুটের জন্য (একত্রিত পরিমাণে)
    for (const [itemId, need] of needByItem) {
      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
      if (Number(item.currentStock) < need) {
        throw new Error(`${item.name} স্টক পর্যাপ্ত নয় (আছে ${item.currentStock}, দরকার ${need})`);
      }
    }

    const batch = await tx.productionBatch.create({
      data: {
        batchNo,
        date: parseDateLocal(input.date),
        machineId: input.machineId || null,
        operatorId: input.operatorId || session.user.id,
        startedAt: parseDateLocal(input.date),
        endedAt: parseDateLocal(input.date),
        status: "COMPLETED",
        recoveryRate: input.recoveryRate ?? null,
        notes: input.notes || null,
        inputs: { create: input.inputs.map((i) => ({ itemId: i.itemId, quantity: i.quantity })) },
        outputs: { create: validOutputs.map((o) => ({ itemId: o.itemId, quantity: o.quantity })) },
      },
    });

    // ইনপুট স্টক কমানো (ধান OUT) — একত্রিত পরিমাণে, অ্যাটমিক
    for (const [itemId, qty] of needByItem) {
      const guarded = await tx.inventoryItem.updateMany({ where: { id: itemId, currentStock: { gte: qty } }, data: { currentStock: { decrement: qty } } });
      if (guarded.count === 0) throw new Error("স্টক পর্যাপ্ত নয় (একই সময়ে অন্য লেনদেনে স্টক বদলে গেছে)");
      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
      const newBal = round2(Number(item.currentStock));
      await tx.stockMovement.create({
        data: { itemId, direction: "OUT", quantity: qty, balance: newBal, refType: "PRODUCTION", refId: batch.id },
      });
    }

    // আউটপুট স্টক বাড়ানো (চাল/উপজাত IN) — একত্রিত পরিমাণে, অ্যাটমিক
    for (const [itemId, qty] of outByItem) {
      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
      const newBal = round2(Number(item.currentStock) + qty);
      await tx.inventoryItem.update({ where: { id: itemId }, data: { currentStock: { increment: qty } } });
      await tx.stockMovement.create({
        data: { itemId, direction: "IN", quantity: qty, balance: newBal, refType: "PRODUCTION", refId: batch.id },
      });
    }
  });
  });

  revalidatePath("/production");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export async function deleteBatch(id: string) {
  await requireUser();
  await prisma.$transaction(async (tx) => {
    const batch = await tx.productionBatch.findUniqueOrThrow({
      where: { id },
      include: { inputs: true, outputs: true },
    });
    // রিভার্সাল মুভমেন্ট রেকর্ড করি (লেজার সামঞ্জস্য রাখতে) + currentStock অ্যাটমিক ফেরত
    for (const it of batch.inputs) {
      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: it.itemId } });
      const newBal = round2(Number(item.currentStock) + Number(it.quantity));
      await tx.inventoryItem.update({ where: { id: it.itemId }, data: { currentStock: { increment: Number(it.quantity) } } });
      await tx.stockMovement.create({
        data: { itemId: it.itemId, direction: "IN", quantity: Number(it.quantity), balance: newBal, refType: "PRODUCTION", refId: `REV-${batch.id}`, note: "ব্যাচ বাতিল — ইনপুট ফেরত" },
      });
    }
    for (const it of batch.outputs) {
      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: it.itemId } });
      // আউটপুট (চাল/উপজাত) ইতিমধ্যে বিক্রি হয়ে গেলে স্টক ঋণাত্মক হতে দেওয়া যাবে না
      if (Number(item.currentStock) < Number(it.quantity)) {
        throw new Error(
          `${item.name} এর উৎপাদিত স্টক ইতিমধ্যে ব্যবহৃত/বিক্রি হয়েছে (আছে ${item.currentStock}), এই ব্যাচ মুছা যাবে না`
        );
      }
      const guarded = await tx.inventoryItem.updateMany({ where: { id: it.itemId, currentStock: { gte: Number(it.quantity) } }, data: { currentStock: { decrement: Number(it.quantity) } } });
      if (guarded.count === 0) throw new Error("স্টক পর্যাপ্ত নয় (একই সময়ে অন্য লেনদেনে স্টক বদলে গেছে)");
      const after = await tx.inventoryItem.findUniqueOrThrow({ where: { id: it.itemId } });
      const newBal = round2(Number(after.currentStock));
      await tx.stockMovement.create({
        data: { itemId: it.itemId, direction: "OUT", quantity: Number(it.quantity), balance: newBal, refType: "PRODUCTION", refId: `REV-${batch.id}`, note: "ব্যাচ বাতিল — আউটপুট ফেরত" },
      });
    }
    await tx.productionBatch.delete({ where: { id } });
    // মূল মুভমেন্ট মুছি না — রিভার্সাল এন্ট্রি তৈরি হয়েছে, দুটো মিলে খতিয়ানের যোগফল শূন্য থাকে।
    // মূলগুলো মুছলে এতিম রিভার্সাল এন্ট্রি খতিয়ানে দুইবার গণনা ঘটাত।
  });
  revalidatePath("/production");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export async function quickCreateInventoryItem(formData: FormData) {
  await requireUser();
  const name = (formData.get("name") as string)?.trim();
  const type = (formData.get("type") as string) || "RICE"; // PADDY | RICE | BYPRODUCT
  if (!ITEM_TYPES.includes(type as any)) throw new Error("সঠিক আইটেম টাইপ দিন");
  // ধান = মণ, উপজাত = বস্তা (byproducts পেজের সাথে সামঞ্জস্য), চাল = কেজি
  const unit = type === "PADDY" ? "মণ" : type === "BYPRODUCT" ? "বস্তা" : "কেজি";

  if (!name) throw new Error("আইটেমের নাম দেওয়া আবশ্যক");

  const existing = await prisma.inventoryItem.findFirst({ where: { name } });
  if (existing) throw new Error("এই নামের আইটেম ইতিমধ্যে ইনভেন্টরিতে আছে");

  await prisma.inventoryItem.create({
    data: {
      name,
      type,
      unit,
      currentStock: 0,
      minStock: 100,
    },
  });

  revalidatePath("/purchases/new");
  revalidatePath("/production/new");
  revalidatePath("/inventory");
}
