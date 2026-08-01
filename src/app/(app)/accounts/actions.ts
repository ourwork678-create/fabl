"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { generateSalariesForMonth, markSalaryPaid } from "@/lib/salary";

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
  const created = await generateSalariesForMonth(formData.get("month") as string);
  revalidatePath("/accounts");
  return created;
}

export async function paySalary(id: string) {
  await requireUser();
  await markSalaryPaid(id);
  revalidatePath("/accounts");
}
