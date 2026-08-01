"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export async function addExpense(formData: FormData) {
  await requireUser();
  const category = formData.get("category") as string;
  const amount = parseFloat(formData.get("amount") as string);
  if (!category || !EXPENSE_CATEGORIES.includes(category as any)) {
    throw new Error("সঠিক ক্যাটাগরি দিন");
  }
  if (!amount || amount <= 0) throw new Error("পরিমাণ সঠিক নয়");

  await prisma.expense.create({
    data: {
      category,
      amount,
      paymentMethod: (formData.get("method") as string) || "CASH",
      description: (formData.get("description") as string) || null,
    },
  });
  revalidatePath("/accounts");
}

export async function generateSalaries(formData: FormData) {
  await requireUser();
  const month = formData.get("month") as string; // 2026-07
  if (!month) throw new Error("মাস দিন");

  // মালিকের বেতন হবে না
  const users = await prisma.user.findMany({
    where: { active: true, role: { not: "OWNER" }, monthlySalary: { gt: 0 } },
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
      // শুধু unique-constraint (ইতিমধ্যে আছে) এড়িয়ে যাই, বাকি সব ত্রুটি ছুড়ে দিই
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }

  revalidatePath("/accounts");
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
  revalidatePath("/accounts");
}
