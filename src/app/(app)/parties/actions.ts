"use server";

import { revalidatePath } from "next/cache";
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

  const code = (formData.get("code") as string)?.trim() || null;
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
  await requireUser();
  await prisma.customer.delete({
    where: { id },
  });
  revalidatePath("/customers");
  revalidatePath("/dashboard");
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

  const code = (formData.get("code") as string)?.trim() || null;
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
  await requireUser();
  await prisma.supplier.delete({
    where: { id },
  });
  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
}

// ===================== PAYMENT ACTIONS =====================

// FIFO: পেমেন্ট পার্টির সবচেয়ে পুরোনো বকেয়া বিক্রয়/ক্রয়ে বরাদ্দ (status হাল রাখে)
async function allocatePayment(
  tx: Tx,
  partyType: "CUSTOMER" | "SUPPLIER",
  partyId: string,
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
    remaining = round2(remaining - applied);
  }
}

// পেমেন্ট মুছলে বরাদ্দকৃত অংশ ফেরত (LIFO)
// ফেরত দেওয়া (restore) পরিমাণ রিটার্ন করে — যদি কোনো সেল/পারচেজ না থাকে (ডিলিট হয়ে গেছে),
// কিছুই ফেরত হয় না, তাই পার্টির বকেয়াও বাড়ানো যাবে না (phantom due এড়াতে)।
async function reversePayment(
  tx: Tx,
  partyType: "CUSTOMER" | "SUPPLIER",
  partyId: string,
  amount: number
): Promise<number> {
  let remaining = round2(amount);
  let restored = 0;
  const where = {
    status: { in: ["PARTIAL", "PAID"] },
    paidAmount: { gt: 0 },
  };
  const docs =
    partyType === "CUSTOMER"
      ? await tx.sale.findMany({ where: { ...where, customerId: partyId }, orderBy: { date: "desc" } })
      : await tx.purchase.findMany({ where: { ...where, supplierId: partyId }, orderBy: { date: "desc" } });
  for (const d of docs) {
    if (remaining <= 0) break;
    const paid = Number(d.paidAmount);
    if (paid <= 0) continue;
    const restore = Math.min(remaining, paid);
    const newPaid = round2(paid - restore);
    const newDue = round2(Number(d.dueAmount) + restore);
    const status = (newPaid <= 0 ? "PENDING" : newDue > 0 ? "PARTIAL" : "PAID") as
      | "PENDING"
      | "PARTIAL"
      | "PAID";
    const data = { paidAmount: newPaid, dueAmount: newDue, status };
    if (partyType === "CUSTOMER") await tx.sale.update({ where: { id: d.id }, data });
    else await tx.purchase.update({ where: { id: d.id }, data });
    remaining = round2(remaining - restore);
    restored = round2(restored + restore);
  }
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

    await tx.payment.create({
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

    if (input.partyType === "CUSTOMER") {
      await tx.customer.update({
        where: { id: input.partyId },
        data: { dueAmount: { decrement: input.amount } },
      });
    } else {
      await tx.supplier.update({
        where: { id: input.partyId },
        data: { dueAmount: { decrement: input.amount } },
      });
    }

    await allocatePayment(tx, input.partyType, input.partyId, input.amount);
  });
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${input.partyId}`);
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${input.partyId}`);
  revalidatePath("/sales");
  revalidatePath("/purchases");
  revalidatePath("/dashboard");
}

export async function deletePayment(id: string) {
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
        const restored = await reversePayment(tx, payment.partyType as "CUSTOMER" | "SUPPLIER", partyId, Number(payment.amount));
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

    await tx.payment.delete({ where: { id } });
  });

  revalidatePath("/customers");
  revalidatePath("/suppliers");
  revalidatePath("/sales");
  revalidatePath("/purchases");
  revalidatePath("/dashboard");
}
