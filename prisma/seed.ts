// প্রথমবার চালু করার স্ক্রিপ্ট — শুধু মালিকের (OWNER) অ্যাকাউন্ট তৈরি করে।
//
// এখানে কোনো ডেমো/নমুনা ডেটা নেই: কাল্পনিক ক্রয়, বিক্রয়, কাস্টমার, সাপ্লায়ার,
// মেশিন বা স্টক কিছুই তৈরি হয় না — মিলের আসল তথ্য অ্যাপের ভেতর থেকেই যোগ হবে।
// স্ক্রিপ্টটি কোনো ডেটা মোছে না, তাই বারবার চালালেও নিরাপদ।
//
// চালানোর নিয়ম:
//   OWNER_EMAIL=owner@example.com OWNER_PASSWORD='শক্তিশালী-পাসওয়ার্ড' npm run db:seed

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.OWNER_EMAIL?.trim();
  const password = process.env.OWNER_PASSWORD;
  const name = process.env.OWNER_NAME?.trim() || "মালিক";

  if (!email || !password) {
    throw new Error(
      "OWNER_EMAIL এবং OWNER_PASSWORD দুটোই দিতে হবে।\n" +
        "উদাহরণ: OWNER_EMAIL=owner@example.com OWNER_PASSWORD='...' npm run db:seed"
    );
  }
  if (password.length < 10) {
    throw new Error("OWNER_PASSWORD অন্তত ১০ অক্ষরের হতে হবে");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`ℹ️  ${email} ইতিমধ্যে আছে — কিছু বদলানো হয়নি।`);
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      designation: "কারখানা স্বত্বাধিকারী",
      passwordHash: await bcrypt.hash(password, 10),
      role: "OWNER",
    },
  });

  console.log(`✅ মালিকের অ্যাকাউন্ট তৈরি হয়েছে: ${email}`);
}

main()
  .catch((e) => {
    console.error("❌", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
