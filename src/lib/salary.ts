// বেতন সংক্রান্ত শেয়ার্ড লজিক — accounts/reports/workforce অ্যাকশন তিন জায়গা থেকেই
// এই ফাংশনগুলো ব্যবহার হয়, যাতে এক জায়গায় ঠিক করলেই সব জায়গায় কার্যকর হয়।
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// নির্দিষ্ট মাসের জন্য সব বেতনভুক্ত (মালিক ব্যতীত) ইউজারের বেতন রেকর্ড তৈরি।
// ইতিমধ্যে থাকা রেকর্ড (unique constraint) এড়িয়ে যায়। তৈরি হওয়া সংখ্যা রিটার্ন করে।
export async function generateSalariesForMonth(month: string): Promise<number> {
  if (!month) throw new Error("মাস দিন");

  // মালিকের বেতন হবে না
  const users = await prisma.user.findMany({
    where: { active: true, role: { not: "OWNER" }, monthlySalary: { gt: 0 } },
  });
  if (users.length === 0) {
    throw new Error("কোনো বেতনভুক্ত কর্মকর্তা বা কর্মচারী নেই (মালিক ব্যতীত)");
  }

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
  return created;
}

// একটি বেতন রেকর্ড পরিশোধিত হিসেবে চিহ্নিত করা
// শর্তসাপেক্ষ আপডেট (status: PENDING) — একই সাথে দুবার ক্লিক করলেও paidDate ওভাররাইট হবে না
export async function markSalaryPaid(id: string): Promise<void> {
  const updated = await prisma.salary.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "PAID", paidDate: new Date() },
  });
  if (updated.count === 0) {
    const existing = await prisma.salary.findUnique({ where: { id } });
    if (!existing) throw new Error("বেতন রেকর্ড পাওয়া যায়নি");
    throw new Error("এই বেতন ইতিমধ্যে পরিশোধিত");
  }
}
