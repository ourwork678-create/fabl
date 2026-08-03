"use server";

import { runAction } from "@/lib/action-result";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { genReceiptNo, round2, withRetry } from "@/lib/utils";

type Tx = Parameters<Parameters<typeof prisma["$transaction"]>[0]>[0];

// ===================== CUSTOMER ACTIONS =====================

export async function createCustomer(formData: FormData) {
  await requireUser();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("নাম দেওয়া আবশ্যক");

  let code = (formData.get("code") as string)?.trim();
  if (!code) {
    // বিদ্যমান সর্বোচ্চ কোড সংখ্যা + ১ (ডিলিট হওয়া কাস্টমার থাকলেও ডুপ্লিকেট এড়াতে)
    const existing = await prisma.customer.findMany({ select: { code: true } });
    let maxNum = 100;
    for (const c of existing) {
      const m = /^C-(\d+)$/.exec(c.code || "");
      if (m) maxNum = Math.max(maxNum, Number(m[1]));
    }
    code = `C-${maxNum + 1}`;
  }

  const phone = (formData.get("phone") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  await prisma.customer.create({
    data: {
      code,
      name,
      phone,
      address,
      notes,
    },
  });

  revalidatePath("/customers");
  revalidatePath("/dashboard");
}

export async function updateCustomer(id: string, formData: FormData) {
  await requireUser();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("নাম দেওয়া আবশ্যক");

  // কোড ফাঁকা রাখলে আগের কোড অক্ষত থাকবে (undefined = আপডেট নয়)
  const code = (formData.get("code") as string)?.trim() || undefined;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  await prisma.customer.update({
    where: { id },
    data: {
      code,
      name,
      phone,
      address,
      notes,
    },
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteCustomer(id: string) {
  return runAction(async () => {
    await requireUser();
    try {
      await prisma.customer.delete({
        where: { id },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        throw new Error("এই কাস্টমারের বিক্রয়/পেমেন্ট রেকর্ড আছে, মুছা যাবে না");
      }
      throw e;
    }
    revalidatePath("/customers");
    revalidatePath("/dashboard");
  });
}

// ===================== SUPPLIER ACTIONS =====================

export async function createSupplier(formData: FormData) {
  await requireUser();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("নাম দেওয়া আবশ্যক");

  let code = (formData.get("code") as string)?.trim();
  if (!code) {
    // বিদ্যমান সর্বোচ্চ কোড সংখ্যা + ১ (ডিলিট হওয়া সাপ্লায়ার থাকলেও ডুপ্লিকেট এড়াতে)
    const existing = await prisma.supplier.findMany({ select: { code: true } });
    let maxNum = 100;
    for (const c of existing) {
      const m = /^S-(\d+)$/.exec(c.code || "");
      if (m) maxNum = Math.max(maxNum, Number(m[1]));
    }
    code = `S-${maxNum + 1}`;
  }

  const phone = (formData.get("phone") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  await prisma.supplier.create({
    data: {
      code,
      name,
      phone,
      address,
      notes,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
}

export async function updateSupplier(id: string, formData: FormData) {
  await requireUser();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("নাম দেওয়া আবশ্যক");

  // কোড ফাঁকা রাখলে আগের কোড অক্ষত থাকবে (undefined = আপডেট নয়)
  const code = (formData.get("code") as string)?.trim() || undefined;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  await prisma.supplier.update({
    where: { id },
    data: {
      code,
      name,
      phone,
      address,
      notes,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteSupplier(id: string) {
  return runAction(async () => {
    await requireUser();
    try {
      await prisma.supplier.delete({
        where: { id },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        throw new Error("এই সাপ্লায়ারের ক্রয়/পেমেন্ট রেকর্ড আছে, মুছা যাবে না");
      }
      throw e;
    }
    revalidatePath("/suppliers");
    revalidatePath("/dashboard");
  });
}

// ===================== PAYMENT ACTIONS =====================

// FIFO: পেমেন্ট পার্টির সবচেয়ে পুরোনো বকেয়া বিক্রয়/ক্রয়ে বরাদ্দ (status হাল রাখে)
// প্রতিটি বরাদ্দ PaymentAllocation-এ রেকর্ড হয়, যাতে পেমেন্ট মুছলে ঠিক সেই মেমো থেকেই ফেরত যায়।
async function allocatePayment(
  tx: Tx,
  partyType: "CUSTOMER" | "SUPPLIER",
  partyId: string,
  paymentId: string,
  amount: number
) {
  let remaining = round2(amount);
  const open = { status: { in: ["PENDING", "PARTIAL"] } };
  const docs =
    partyType === "CUSTOMER"
      ? await tx.sale.findMany({ where: { ...open, customerId: partyId }, orderBy: { date: "asc" } })
      : await tx.purchase.findMany({ where: { ...open, supplierId: partyId }, orderBy: { date: "asc" } });
  for (const d of docs) {
    if (remaining <= 0) break;
    const due = Number(d.dueAmount);
    if (due <= 0) continue;
    const applied = Math.min(remaining, due);
    const data = {
      paidAmount: round2(Number(d.paidAmount) + applied),
      dueAmount: round2(due - applied),
      status: (round2(due - applied) <= 0 ? "PAID" : "PARTIAL") as "PAID" | "PARTIAL",
    };
    if (partyType === "CUSTOMER") await tx.sale.update({ where: { id: d.id }, data });
    else await tx.purchase.update({ where: { id: d.id }, data });
    await tx.paymentAllocation.create({
      data: {
        paymentId,
        docType: partyType === "CUSTOMER" ? "SALE" : "PURCHASE",
        docId: d.id,
        amount: applied,
      },
    });
    remaining = round2(remaining - applied);
  }
}

// পেমেন্ট মুছলে PaymentAllocation অনুযায়ী ঠিক সেই মেমোগুলো থেকেই বরাদ্দ ফেরত।
// ফেরত দেওয়া (restore) পরিমাণ রিটার্ন করে — মেমো ইতিমধ্যে মুছে গেলে সেই অংশ ফেরত হয় না
// (phantom due এড়াতে)। পুরোনো পেমেন্টে (বরাদ্দ রেকর্ড নেই) কিছুই ফেরত হয় না — নিরাপদ ডিফল্ট।
async function reversePayment(tx: Tx, paymentId: string): Promise<number> {
  let restored = 0;
  const allocations = await tx.paymentAllocation.findMany({ where: { paymentId } });
  for (const a of allocations) {
    const restore = Number(a.amount);
    const doc =
      a.docType === "SALE"
        ? await tx.sale.findUnique({ where: { id: a.docId } })
        : await tx.purchase.findUnique({ where: { id: a.docId } });
    if (!doc) continue; // মেমো মুছে গেছে — এই অংশ ফেরত হবে না
    const paid = Number(doc.paidAmount);
    const actualRestore = Math.min(restore, paid); // সুরক্ষা: paid-এর বেশি ফেরত নয়
    if (actualRestore <= 0) continue;
    const newPaid = round2(paid - actualRestore);
    const newDue = round2(Number(doc.dueAmount) + actualRestore);
    const status = (newPaid <= 0 ? "PENDING" : newDue > 0 ? "PARTIAL" : "PAID") as
      | "PENDING"
      | "PARTIAL"
      | "PAID";
    const data = { paidAmount: newPaid, dueAmount: newDue, status };
    if (a.docType === "SALE") await tx.sale.update({ where: { id: doc.id }, data });
    else await tx.purchase.update({ where: { id: doc.id }, data });
    restored = round2(restored + actualRestore);
  }
  await tx.paymentAllocation.deleteMany({ where: { paymentId } });
  return restored;
}

export async function recordPayment(input: {
  partyType: "CUSTOMER" | "SUPPLIER";
  partyId: string;
  direction: "RECEIVED" | "PAID";
  amount: number;
  method: string;
  note?: string;
}) {
  return runAction(async () => {
    await requireUser();
    // NaN/শূন্য/ঋণাত্মক একসাথে বাদ
    if (!(input.amount > 0)) throw new Error("পরিমাণ সঠিক নয়");
    // শুধু দুটি বৈধ দিক সাপোর্টেড (অন্যগুলো নীরব no-op নয়, স্পষ্ট ত্রুটি)
    const valid =
      (input.partyType === "CUSTOMER" && input.direction === "RECEIVED") ||
      (input.partyType === "SUPPLIER" && input.direction === "PAID");
    if (!valid) throw new Error("অসমর্থিত পেমেন্ট দিক");

    await withRetry(async () => {
      const refNo = genReceiptNo("VOU");
    await prisma.$transaction(async (tx) => {
      // বর্তমান বকেয়া বের করে ওভার-পেমেন্ট প্রতিরোধ
      const party =
        input.partyType === "CUSTOMER"
          ? await tx.customer.findUniqueOrThrow({ where: { id: input.partyId } })
          : await tx.supplier.findUniqueOrThrow({ where: { id: input.partyId } });
      const currentDue = Number(party.dueAmount);
      if (input.amount > currentDue) {
        throw new Error(`বকেয়ার চেয়ে বেশি পরিশোধ করা যাবে না (বকেয়া ${currentDue})`);
      }

      const payment = await tx.payment.create({
        data: {
          refNo,
          partyType: input.partyType,
          customerId: input.partyType === "CUSTOMER" ? input.partyId : null,
          supplierId: input.partyType === "SUPPLIER" ? input.partyId : null,
          direction: input.direction,
          amount: input.amount,
          method: input.method,
          note: input.note || null,
        },
      });

      // শর্তসাপেক্ষ ডিক্রিমেন্ট — একই সাথে দুটি পেমেন্ট এলেও বকেয়া ঋণাত্মক হবে না
      const updated =
        input.partyType === "CUSTOMER"
          ? await tx.customer.updateMany({
              where: { id: input.partyId, dueAmount: { gte: input.amount } },
              data: { dueAmount: { decrement: input.amount } },
            })
          : await tx.supplier.updateMany({
              where: { id: input.partyId, dueAmount: { gte: input.amount } },
              data: { dueAmount: { decrement: input.amount } },
            });
      if (updated.count === 0) {
        throw new Error("বকেয়ার চেয়ে বেশি পরিশোধ করা যাবে না (বকেয়া ইতিমধ্যে পরিবর্তিত হয়েছে)");
      }

      await allocatePayment(tx, input.partyType, input.partyId, payment.id, input.amount);
    });
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${input.partyId}`);
    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${input.partyId}`);
    revalidatePath("/sales");
    revalidatePath("/purchases");
    revalidatePath("/dashboard");
  });
}

export async function deletePayment(id: string) {
  return runAction(async () => {
    await requireUser();

    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id } });
      if (!payment) return;

      const partyId = payment.customerId || payment.supplierId;
      if (partyId) {
        const valid =
          (payment.partyType === "CUSTOMER" && payment.direction === "RECEIVED") ||
          (payment.partyType === "SUPPLIER" && payment.direction === "PAID");
        if (valid) {
          // শুধু যে অংশ আসলে ফেরত বরাদ্দ হয়েছে সেটাই বকেয়ায় যোগ হবে (ডিলিট হওয়া সেল/পারচেজের ক্ষেত্রে ০)
          const restored = await reversePayment(tx, payment.id);
          if (restored > 0) {
            if (payment.partyType === "CUSTOMER") {
              await tx.customer.update({
                where: { id: partyId },
                data: { dueAmount: { increment: restored } },
              });
            } else {
              await tx.supplier.update({
                where: { id: partyId },
                data: { dueAmount: { increment: restored } },
              });
            }
          }
        }
      }

      // বরাদ্দ রেকর্ড পরিষ্কার (reversePayment না চললেও এতিম রেকর্ড না থাকে)
      await tx.paymentAllocation.deleteMany({ where: { paymentId: id } });
      await tx.payment.delete({ where: { id } });
    });

    revalidatePath("/customers");
    revalidatePath("/suppliers");
    revalidatePath("/sales");
    revalidatePath("/purchases");
    revalidatePath("/dashboard");
  });
}
