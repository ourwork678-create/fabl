"use server";

import { runAction } from "@/lib/action-result";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { parseDateLocal } from "@/lib/utils";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { generateSalariesForMonth, markSalaryPaid } from "@/lib/salary";

export async function addExpense(formData: FormData) {
  return runAction(async () => {
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

    revalidatePath("/reports");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
  });
}

export async function generateSalaries(formData: FormData) {
  return runAction(async () => {
    await requireUser();
    await generateSalariesForMonth(formData.get("month") as string);

    revalidatePath("/reports");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
  });
}

export async function paySalary(id: string) {
  return runAction(async () => {
    await requireUser();
    await markSalaryPaid(id);

    revalidatePath("/reports");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
  });
}

export async function addCashDeposit(formData: FormData) {
  return runAction(async () => {
    await requireUser();
    const amount = parseFloat(formData.get("amount") as string);
    const paymentMethod = (formData.get("method") as string) || "BANK";
    const description = (formData.get("description") as string) || "ক্যাশ জমাদান (ব্যাংকে/তহবিলে)";
    const customDate = formData.get("date") as string;

    if (!amount || amount <= 0) throw new Error("সঠিক টাকার পরিমাণ লিখুন");

    const date = parseDateLocal(customDate);

    await prisma.expense.create({
      data: {
        category: "ক্যাশ জমা",
        amount,
        paymentMethod,
        description,
        date,
      },
    });

    revalidatePath("/reports");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
  });
}

export async function deleteExpense(id: string) {
  await requireUser();
  await prisma.$transaction(async (tx) => {
    // এই খরচ কোনো কর্মী-পেমেন্টের সাথে যুক্ত হলে সেই লেনদেন ও ব্যালেন্সও উল্টাতে হবে,
    // নাহলে কর্মীর প্রদেয় ব্যালেন্স চিরতরে ভুল থেকে যেত
    const linkedTxn = await tx.workforceTransaction.findFirst({
      where: { linkedExpenseId: id },
    });
    if (linkedTxn) {
      await tx.workforceMember.update({
        where: { id: linkedTxn.workforceMemberId },
        data: { balance: { increment: Number(linkedTxn.amount) } },
      });
      await tx.workforceTransaction.delete({ where: { id: linkedTxn.id } });
    }
    await tx.expense.delete({ where: { id } });
  });

  revalidatePath("/reports");
  revalidatePath("/accounts");
  revalidatePath("/workforce");
  revalidatePath("/dashboard");
}
