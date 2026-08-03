// ⚠️ ধ্বংসাত্মক: ডেটাবেসের সব ব্যবসায়িক ডেটা ও সব ইউজার মুছে ফেলে।
// হ্যান্ডওভারের আগে ডেমো/সিড ডেটা পরিষ্কার করার জন্য — একবারই চালানোর কথা।
// চালানোর পর মালিকের অ্যাকাউন্ট বানাতে: npm run db:seed
//
//   CONFIRM_RESET=yes npx tsx prisma/reset-data.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.CONFIRM_RESET !== "yes") {
    throw new Error("নিরাপত্তার জন্য CONFIRM_RESET=yes দিয়ে চালাতে হবে");
  }

  // ফরেন-কি নির্ভরতার ক্রম মেনে মোছা
  const steps: [string, () => Promise<{ count: number }>][] = [
    ["workforceTransaction", () => prisma.workforceTransaction.deleteMany()],
    ["workforceMember", () => prisma.workforceMember.deleteMany()],
    ["stockMovement", () => prisma.stockMovement.deleteMany()],
    ["saleItem", () => prisma.saleItem.deleteMany()],
    ["sale", () => prisma.sale.deleteMany()],
    ["purchaseItem", () => prisma.purchaseItem.deleteMany()],
    ["purchase", () => prisma.purchase.deleteMany()],
    ["productionOutput", () => prisma.productionOutput.deleteMany()],
    ["productionInput", () => prisma.productionInput.deleteMany()],
    ["productionBatch", () => prisma.productionBatch.deleteMany()],
    ["machineLog", () => prisma.machineLog.deleteMany()],
    ["machine", () => prisma.machine.deleteMany()],
    ["payment", () => prisma.payment.deleteMany()],
    ["salary", () => prisma.salary.deleteMany()],
    ["expense", () => prisma.expense.deleteMany()],
    ["inventoryItem", () => prisma.inventoryItem.deleteMany()],
    ["customer", () => prisma.customer.deleteMany()],
    ["supplier", () => prisma.supplier.deleteMany()],
    ["user", () => prisma.user.deleteMany()],
  ];

  for (const [name, run] of steps) {
    const { count } = await run();
    console.log(`  ${name}: ${count}`);
  }
  console.log("\n✅ ডেটাবেস খালি। এখন চালান: npm run db:seed");
}

main()
  .catch((e) => {
    console.error("❌", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
