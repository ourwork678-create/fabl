"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/guard";
import { USER_ROLES } from "@/lib/constants";

// রোল অনুসারে সিনিয়রিটি (OWNER সর্বোচ্চ)
function roleRank(role: string): number {
  return { OWNER: 4, MANAGER: 3, ACCOUNTANT: 2, OPERATOR: 1 }[role] ?? 0;
}

// Helper: parse decimal input
function parseDecimal(v: FormDataEntryValue | null): number {
  if (!v || String(v) === "") return 0;
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? 0 : n;
}

export async function createWorkforceMember(formData: FormData) {
  await requireUser();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("নাম দেওয়া আবশ্যক");

  const phone = (formData.get("phone") as string)?.trim() || null;
  const designation = (formData.get("designation") as string)?.trim() || null;
  const rateType = (formData.get("rateType") as string) || "DAILY";
  const rateAmount = parseDecimal(formData.get("rateAmount"));

  await prisma.workforceMember.create({
    data: {
      name,
      phone,
      designation,
      rateType,
      rateAmount,
      balance: 0,
      active: true,
    },
  });

  revalidatePath("/workforce");
  redirect("/workforce");
}

export async function updateWorkforceMember(id: string, formData: FormData) {
  await requireUser();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("নাম দেওয়া আবশ্যক");

  const phone = (formData.get("phone") as string)?.trim() || null;
  const designation = (formData.get("designation") as string)?.trim() || null;
  const rateType = (formData.get("rateType") as string) || "DAILY";
  const rateAmount = parseDecimal(formData.get("rateAmount"));

  await prisma.workforceMember.update({
    where: { id },
    data: {
      name,
      phone,
      designation,
      rateType,
      rateAmount,
    },
  });

  revalidatePath("/workforce");
  revalidatePath(`/workforce/${id}`);
  redirect("/workforce");
}

export async function deleteWorkforceMember(id: string) {
  await requireUser();
  
  // Find linked transactions that have expenses, and delete them
  const payments = await prisma.workforceTransaction.findMany({
    where: { workforceMemberId: id, type: "PAYMENT", linkedExpenseId: { not: null } },
  });

  await prisma.$transaction(async (tx) => {
    // Delete linked expenses
    for (const p of payments) {
      if (p.linkedExpenseId) {
        await tx.expense.deleteMany({ where: { id: p.linkedExpenseId } });
      }
    }
    // Delete member (cascade will delete transactions)
    await tx.workforceMember.delete({ where: { id } });
  });

  revalidatePath("/workforce");
}

export async function createWorkforceTransaction(formData: FormData) {
  await requireUser();
  const workforceMemberId = formData.get("workforceMemberId") as string;
  const type = formData.get("type") as string; // BILL | PAYMENT
  const amount = parseDecimal(formData.get("amount"));
  const dateStr = formData.get("date") as string;
  const date = dateStr ? new Date(dateStr) : new Date();
  const description = (formData.get("description") as string)?.trim() || null;
  const paymentMethod = (formData.get("paymentMethod") as string) || null;

  if (!workforceMemberId || !(amount > 0)) {
    throw new Error("সঠিক তথ্য প্রদান করুন");
  }
  if (type !== "BILL" && type !== "PAYMENT") {
    throw new Error("সঠিক লেনদেনের ধরন দিন (BILL বা PAYMENT)");
  }

  const member = await prisma.workforceMember.findUnique({
    where: { id: workforceMemberId },
  });
  if (!member) throw new Error("কর্মী পাওয়া যায়নি");

  await prisma.$transaction(async (tx) => {
    let linkedExpenseId: string | null = null;

    // 1. If payment, create main account Expense record
    if (type === "PAYMENT") {
      if (!paymentMethod) throw new Error("পেমেন্ট পদ্ধতি নির্বাচন করুন");

      const exp = await tx.expense.create({
        data: {
          date,
          category: "শ্রম",
          amount,
          paymentMethod,
          description: `কর্মীবাহিনী পরিশোধ: ${member.name}${description ? ` - ${description}` : ""}`,
        },
      });
      linkedExpenseId = exp.id;
    }

    // 2. Create Workforce transaction
    await tx.workforceTransaction.create({
      data: {
        workforceMemberId,
        date,
        type,
        amount,
        paymentMethod,
        description,
        linkedExpenseId,
      },
    });

    // 3. Update outstanding balance
    const change = type === "BILL" ? amount : -amount;
    await tx.workforceMember.update({
      where: { id: workforceMemberId },
      data: {
        balance: { increment: change },
      },
    });
  });

  revalidatePath("/workforce");
  revalidatePath(`/workforce/${workforceMemberId}`);
  revalidatePath("/accounts");
}

export async function deleteWorkforceTransaction(id: string) {
  await requireUser();

  const txn = await prisma.workforceTransaction.findUnique({
    where: { id },
    include: { workforceMember: true },
  });
  if (!txn) throw new Error("লেনদেন পাওয়া যায়নি");

  await prisma.$transaction(async (tx) => {
    // 1. If it was a payment, delete the linked expense (deleteMany → না পেলে ত্রুটি নয়)
    if (txn.type === "PAYMENT" && txn.linkedExpenseId) {
      await tx.expense.deleteMany({ where: { id: txn.linkedExpenseId } });
    }

    // 2. Adjust workforce member balance back
    const reverseChange = txn.type === "BILL" ? -Number(txn.amount) : Number(txn.amount);
    await tx.workforceMember.update({
      where: { id: txn.workforceMemberId },
      data: {
        balance: { increment: reverseChange },
      },
    });

    // 3. Delete transaction
    await tx.workforceTransaction.delete({
      where: { id },
    });
  });

  revalidatePath("/workforce");
  revalidatePath(`/workforce/${txn.workforceMemberId}`);
  revalidatePath("/accounts");
}

export async function generateSalaries(formData: FormData) {
  await requireUser();
  const month = formData.get("month") as string;
  if (!month) throw new Error("মাস দিন");

  // Exclude owner (মালিকের বেতন হবে না)
  const users = await prisma.user.findMany({
    where: {
      active: true,
      role: { not: "OWNER" },
      monthlySalary: { gt: 0 },
    },
  });

  if (users.length === 0) throw new Error("কোনো বেতনভুক্ত কর্মকর্তা বা কর্মচারী নেই (মালিক ব্যতীত)");

  let created = 0;
  for (const u of users) {
    try {
      await prisma.salary.create({
        data: {
          userId: u.id,
          month,
          amount: u.monthlySalary!,
          bonus: 0,
          deduction: 0,
          netAmount: u.monthlySalary!,
          status: "PENDING",
        },
      });
      created++;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }

  revalidatePath("/workforce");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  return created;
}

export async function paySalary(id: string) {
  await requireUser();
  const existing = await prisma.salary.findUnique({ where: { id } });
  if (!existing) throw new Error("বেতন রেকর্ড পাওয়া যায়নি");
  if (existing.status === "PAID") throw new Error("এই বেতন ইতিমধ্যে পরিশোধিত");
  await prisma.salary.update({
    where: { id },
    data: { status: "PAID", paidDate: new Date() },
  });

  revalidatePath("/workforce");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

export async function createStaffUser(formData: FormData) {
  const session = await requireRole("OWNER", "MANAGER");
  const callerRole = (session.user as any).role as string;
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const designation = (formData.get("designation") as string)?.trim() || null;
  const role = (formData.get("role") as string) || "OPERATOR";
  const monthlySalary = parseDecimal(formData.get("monthlySalary"));
  const password = (formData.get("password") as string) || "staff123";

  if (!name) throw new Error("কর্মকর্তা/স্টাফের নাম আবশ্যক");
  if (!email) throw new Error("ইমেইল আবশ্যক");
  if (!USER_ROLES.includes(role as any)) throw new Error("সঠিক ভূমিকা দিন");
  if (role === "OWNER") throw new Error("মালিক একাউন্ট এখান থেকে যোগ করা যাবে না");
  // নিম্ন রোলের ইউজার উচ্চতর বা সমান রোল তৈরি করতে পারবে না
  if (roleRank(role) >= roleRank(callerRole)) {
    throw new Error("এই রোলে ইউজার তৈরির অনুমতি নেই");
  }

  const bcrypt = (await import("bcryptjs")).default;
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      phone,
      designation,
      role,
      passwordHash,
      monthlySalary,
      active: true,
    },
  });

  revalidatePath("/workforce");
  revalidatePath("/settings");
}

export async function updateStaffUser(id: string, formData: FormData) {
  const session = await requireRole("OWNER", "MANAGER");
  const callerRole = (session.user as any).role as string;
  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const designation = (formData.get("designation") as string)?.trim() || null;
  const role = (formData.get("role") as string) || "OPERATOR";
  const monthlySalary = parseDecimal(formData.get("monthlySalary"));

  if (!name) throw new Error("নাম আবশ্যক");
  if (!USER_ROLES.includes(role as any)) throw new Error("সঠিক ভূমিকা দিন");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("ইউজার পাওয়া যায়নি");
  if (user.role === "OWNER") throw new Error("মালিকের তথ্য এখান থেকে এডিট করা যাবে না");
  // নিজের বা উচ্চতর/সমান রোলের ইউজার এডিট করা যাবে না
  if (id === (session.user as any).id) throw new Error("নিজের অ্যাকাউন্ট এখান থেকে এডিট করা যাবে না");
  if (roleRank(user.role) >= roleRank(callerRole)) {
    throw new Error("এই ইউজার পরিবর্তনের অনুমতি নেই");
  }
  if (roleRank(role) >= roleRank(callerRole)) {
    throw new Error("এই রোলে ইউজার পরিবর্তনের অনুমতি নেই");
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
      phone,
      designation,
      role,
      monthlySalary,
    },
  });

  revalidatePath("/workforce");
  revalidatePath("/settings");
}
