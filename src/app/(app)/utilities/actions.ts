"use server";

import { runAction } from "@/lib/action-result";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { parseDateLocal } from "@/lib/utils";
import { UTILITY_CATEGORIES } from "@/lib/constants";

export async function addUtilityExpense(formData: FormData) {
  await requireUser();
  const category = (formData.get("category") as string) || "বিদ্যুৎ";
  if (!UTILITY_CATEGORIES.includes(category as any)) {
    throw new Error("সঠিক ক্যাটাগরি দিন");
  }
  const amount = Number(formData.get("amount"));
  const paymentMethod = (formData.get("paymentMethod") as string) || "CASH";
  const description = (formData.get("description") as string) || null;
  const customDate = formData.get("date") as string;

  if (!amount || amount <= 0) {
    throw new Error("সঠিক টাকার পরিমাণ লিখুন");
  }

  const date = parseDateLocal(customDate);

  await prisma.expense.create({
    data: {
      category,
      amount,
      paymentMethod,
      description,
      date,
    },
  });

  revalidatePath("/utilities");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function deleteUtilityExpense(id: string) {
  return runAction(async () => {
    await requireUser();
    await prisma.$transaction(async (tx) => {
      // সুরক্ষা: খরচটি কর্মী-পেমেন্টের সাথে যুক্ত হলে সেই লেনদেন ও ব্যালেন্সও উল্টানো হবে
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

    revalidatePath("/utilities");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
  });
}
