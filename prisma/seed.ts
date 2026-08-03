// প্রথমবার চালু করার স্ক্রিপ্ট — শুধু মালিকের (OWNER) অ্যাকাউন্ট তৈরি করে।
//
// এখানে কোনো ডেমো/নমুনা ডেটা নেই: কাল্পনিক ক্রয়, বিক্রয়, কাস্টমার, সাপ্লায়ার,
// মেশিন বা স্টক কিছুই তৈরি হয় না — মিলের আসল তথ্য অ্যাপের ভেতর থেকেই যোগ হবে।
// স্ক্রিপ্টটি কোনো ডেটা মোছে না, তাই বারবার চালালেও নিরাপদ।
//
// চালানোর নিয়ম:
//   npm run db:seed
// ইমেইল ও পাসওয়ার্ড টার্মিনালেই জিজ্ঞেস করা হবে (চাইলে OWNER_EMAIL /
// OWNER_PASSWORD এনভায়রনমেন্ট ভেরিয়েবল দিয়েও দেওয়া যায়)।

import "dotenv/config";
import readline from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// এনভায়রনমেন্ট ভেরিয়েবল না দিলে টার্মিনালেই জিজ্ঞেস করা হয় —
// পাসওয়ার্ড তখন কমান্ড হিস্ট্রিতে বা কোনো ফাইলে জমা থাকে না।
async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const email = (process.env.OWNER_EMAIL?.trim()) || (await ask("মালিকের ইমেইল: "));
  const password = process.env.OWNER_PASSWORD || (await ask("পাসওয়ার্ড (অন্তত ১০ অক্ষর): "));
  const name = process.env.OWNER_NAME?.trim() || "মালিক";

  if (!email || !password) {
    throw new Error(
      "ইমেইল ও পাসওয়ার্ড দুটোই দিতে হবে।\n" +
        "খালি রেখে এন্টার দেবেন না।"
    );
  }
  if (password.length < 10) {
    throw new Error("পাসওয়ার্ড অন্তত ১০ অক্ষরের হতে হবে");
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
