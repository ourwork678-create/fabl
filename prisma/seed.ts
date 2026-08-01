import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 পুরোনো সব ডেটা মোছা হচ্ছে...");

  // ১. সম্পূর্ণ ডেটা রিসেট (ডিলিট)
  await prisma.workforceTransaction.deleteMany();
  await prisma.workforceMember.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.productionOutput.deleteMany();
  await prisma.productionInput.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.machineLog.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.salary.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ পুরোনো ডেটা সম্পূর্ণ পরিষ্কার করা হয়েছে।");
  console.log("🌱 নতুন রিয়েলিস্টিক ফ্যাক্টরি ডেটা সিড করা হচ্ছে...");

  // ২. ইউজার তৈরি (মালিক, ম্যানেজার, অপারেটর)
  const password = await bcrypt.hash("admin123", 10);

  const owner = await prisma.user.create({
    data: {
      name: "মালিক (অ্যাডমিন)",
      email: "owner@niceplr.bd",
      phone: "01700000000",
      designation: "কারখানা স্বত্বাধিকারী",
      passwordHash: password,
      role: "OWNER",
      monthlySalary: 60000,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "রফিকুল ইসলাম",
      email: "manager@niceplr.bd",
      phone: "01711000001",
      designation: "জেনারেল ম্যানেজার",
      passwordHash: await bcrypt.hash("manager123", 10),
      role: "MANAGER",
      monthlySalary: 30000,
    },
  });

  const operator = await prisma.user.create({
    data: {
      name: "মোঃ শাহীন",
      email: "operator@niceplr.bd",
      phone: "01711000002",
      designation: "মেইন মিল অপারেটর",
      passwordHash: await bcrypt.hash("operator123", 10),
      role: "OPERATOR",
      monthlySalary: 18000,
    },
  });

  // ৩. ইনভেন্টরি আইটেমসমূহ (ধান, চাল, উপজাত - ইতিবাচক ও বাস্তবসম্মত পরিমাণ)
  // ধান (একক: মণ)
  const paddy1 = await prisma.inventoryItem.create({
    data: { name: "ধান - মিনিকেট", type: "PADDY", unit: "মণ", currentStock: 1850, minStock: 200, saleRate: 1450 },
  });
  const paddy2 = await prisma.inventoryItem.create({
    data: { name: "ধান - ২৮", type: "PADDY", unit: "মণ", currentStock: 1220, minStock: 200, saleRate: 1320 },
  });
  const paddy3 = await prisma.inventoryItem.create({
    data: { name: "ধান - স্বর্ণা", type: "PADDY", unit: "মণ", currentStock: 850, minStock: 150, saleRate: 1200 },
  });

  // চাল (একক: কেজি)
  const rice1 = await prisma.inventoryItem.create({
    data: { name: "চাল - মিনিকেট", type: "RICE", unit: "কেজি", currentStock: 2850, minStock: 200, saleRate: 68 },
  });
  const rice2 = await prisma.inventoryItem.create({
    data: { name: "চাল - ২৮", type: "RICE", unit: "কেজি", currentStock: 1920, minStock: 200, saleRate: 58 },
  });
  const rice3 = await prisma.inventoryItem.create({
    data: { name: "চাল - স্বর্ণা", type: "RICE", unit: "কেজি", currentStock: 1450, minStock: 150, saleRate: 52 },
  });

  // উপজাত (একক: বস্তা / কেজি)
  const gura = await prisma.inventoryItem.create({
    data: { name: "গুঁড়া", type: "BYPRODUCT", unit: "বস্তা", currentStock: 95, minStock: 20, saleRate: 650 },
  });
  const khud = await prisma.inventoryItem.create({
    data: { name: "খুদ", type: "BYPRODUCT", unit: "কেজি", currentStock: 340, minStock: 100, saleRate: 38 },
  });
  const tush = await prisma.inventoryItem.create({
    data: { name: "তুষ", type: "BYPRODUCT", unit: "বস্তা", currentStock: 180, minStock: 30, saleRate: 420 },
  });

  // ৪. সাপ্লায়ারগণ (ধান সরবরাহকারী)
  const sup1 = await prisma.supplier.create({
    data: { code: "SUP-101", name: "মেসার্স আলম ট্রেডার্স (দিনাজপুর)", phone: "01711223344", address: "দিনাজপুর সদর", dueAmount: 18500 },
  });
  const sup2 = await prisma.supplier.create({
    data: { code: "SUP-102", name: "হাজী কাসেম গেইল (নওগাঁ)", phone: "01811223344", address: "মহাদেবপুর, নওগাঁ", dueAmount: 0 },
  });
  const sup3 = await prisma.supplier.create({
    data: { code: "SUP-103", name: "মোঃ রফিকুল ইসলাম (বগুড়া)", phone: "01911223344", address: "শেরপুর, বগুড়া", dueAmount: 12000 },
  });

  // ৫. কাস্টমারগণ (চাল ও উপজাত পাইকারি ক্রেতা)
  const cus1 = await prisma.customer.create({
    data: { code: "CUS-101", name: "মেসার্স বিসমিল্লাহ রাইস এজেন্সী (ঢাকা)", phone: "01799887766", address: "বাদামতলী, ঢাকা", dueAmount: 24500 },
  });
  const cus2 = await prisma.customer.create({
    data: { code: "CUS-102", name: "সততা রাইস স্টোর (চট্টগ্রাম)", phone: "01899887766", address: "পাহাড়তলী, চট্টগ্রাম", dueAmount: 14000 },
  });
  const cus3 = await prisma.customer.create({
    data: { code: "CUS-103", name: "শাহ পরান ট্রেডার্স (সিলেট)", phone: "01999887766", address: "কদমতলী, সিলেট", dueAmount: 0 },
  });
  const cus4 = await prisma.customer.create({
    data: { code: "CUS-104", name: "ক্যাশ কাস্টমার (খুচরা)", phone: "01700000000", address: "ফ্যাক্টরি কাউন্টার", dueAmount: 0 },
  });

  // ৬. মেশিনপত্র
  const boiler = await prisma.machine.create({
    data: { code: "BOI-01", name: "বয়লার স্টিম ইউনিট-১", type: "BOILER", capacityPerHr: 60, status: "RUNNING" },
  });
  const dryer = await prisma.machine.create({
    data: { code: "DRY-01", name: "ড্রায়ার অটো-১", type: "DRYER", capacityPerHr: 50, status: "RUNNING" },
  });
  const huller = await prisma.machine.create({
    data: { code: "HUL-01", name: "হালার মিলিং প্রসেসিং-১", type: "HULLER", capacityPerHr: 40, status: "RUNNING" },
  });
  const polisher = await prisma.machine.create({
    data: { code: "POL-01", name: "পলিশার ও কালার সোর্টার-১", type: "POLISHER", capacityPerHr: 35, status: "IDLE" },
  });

  // ৭. ধান ক্রয় লেনদেনসমূহ (Historical Purchases across 5 Months)
  const now = new Date();
  const m4 = new Date(now.getFullYear(), now.getMonth() - 4, 10);
  const m3 = new Date(now.getFullYear(), now.getMonth() - 3, 14);
  const m2 = new Date(now.getFullYear(), now.getMonth() - 2, 12);
  const m1 = new Date(now.getFullYear(), now.getMonth() - 1, 18);
  const m0 = new Date(now.getFullYear(), now.getMonth(), 8);
  const m0b = new Date(now.getFullYear(), now.getMonth(), 22);

  // ক্রয় ১ (Month -4)
  await prisma.purchase.create({
    data: {
      receiptNo: `PUR-${now.getFullYear()}-0001`,
      date: m4,
      supplierId: sup1.id,
      subtotal: 362500,
      totalAmount: 362500,
      paidAmount: 362500,
      dueAmount: 0,
      status: "PAID",
      notes: "দিনাজপুর থেকে মিনিকেট ধান চালান",
      items: { create: [{ itemId: paddy1.id, quantity: 250, rate: 1450, amount: 362500 }] },
    },
  });

  // ক্রয় ২ (Month -3)
  await prisma.purchase.create({
    data: {
      receiptNo: `PUR-${now.getFullYear()}-0002`,
      date: m3,
      supplierId: sup2.id,
      subtotal: 396000,
      totalAmount: 396000,
      paidAmount: 396000,
      dueAmount: 0,
      status: "PAID",
      notes: "নওগাঁর ২৮ ধান চালান",
      items: { create: [{ itemId: paddy2.id, quantity: 300, rate: 1320, amount: 396000 }] },
    },
  });

  // ক্রয় ৩ (Month -2)
  await prisma.purchase.create({
    data: {
      receiptNo: `PUR-${now.getFullYear()}-0003`,
      date: m2,
      supplierId: sup3.id,
      subtotal: 435000,
      totalAmount: 435000,
      paidAmount: 423000,
      dueAmount: 12000,
      status: "PARTIAL",
      notes: "বগুড়ার স্বর্ণা ধান বড় চালান",
      items: { create: [{ itemId: paddy3.id, quantity: 362.5, rate: 1200, amount: 435000 }] },
    },
  });

  // ক্রয় ৪ (Month -1)
  await prisma.purchase.create({
    data: {
      receiptNo: `PUR-${now.getFullYear()}-0004`,
      date: m1,
      supplierId: sup1.id,
      subtotal: 507500,
      totalAmount: 507500,
      paidAmount: 489000,
      dueAmount: 18500,
      status: "PARTIAL",
      notes: "মিনিকেট ধান প্রিমিয়াম চালান",
      items: { create: [{ itemId: paddy1.id, quantity: 350, rate: 1450, amount: 507500 }] },
    },
  });

  // ক্রয় ৫ (Current Month)
  await prisma.purchase.create({
    data: {
      receiptNo: `PUR-${now.getFullYear()}-0005`,
      date: m0,
      supplierId: sup2.id,
      subtotal: 330000,
      totalAmount: 330000,
      paidAmount: 330000,
      dueAmount: 0,
      status: "PAID",
      notes: "চলতি মাসের ২য় ধান স্টক চালান",
      items: { create: [{ itemId: paddy2.id, quantity: 250, rate: 1320, amount: 330000 }] },
    },
  });

  // ৮. চাল ও উপজাত বিক্রি লেনদেনসমূহ (Historical Sales - HIGHER THAN PURCHASES TO ENSURE POSITIVE PROFIT)
  const sm4 = new Date(now.getFullYear(), now.getMonth() - 4, 18);
  const sm3 = new Date(now.getFullYear(), now.getMonth() - 3, 22);
  const sm2 = new Date(now.getFullYear(), now.getMonth() - 2, 20);
  const sm1 = new Date(now.getFullYear(), now.getMonth() - 1, 25);
  const sm0a = new Date(now.getFullYear(), now.getMonth(), 12);
  const sm0b = new Date(now.getFullYear(), now.getMonth(), 28);

  // বিক্রি ১ (Month -4)
  await prisma.sale.create({
    data: {
      receiptNo: `SAL-${now.getFullYear()}-0001`,
      date: sm4,
      customerId: cus1.id,
      subtotal: 510000,
      totalAmount: 510000,
      paidAmount: 510000,
      dueAmount: 0,
      status: "PAID",
      notes: "ঢাকায় মিনিকেট চাল পাইকারি চালান",
      items: { create: [{ itemId: rice1.id, quantity: 7500, rate: 68, amount: 510000 }] },
    },
  });

  // বিক্রি ২ (Month -3)
  await prisma.sale.create({
    data: {
      receiptNo: `SAL-${now.getFullYear()}-0002`,
      date: sm3,
      customerId: cus2.id,
      subtotal: 580000,
      totalAmount: 580000,
      paidAmount: 566000,
      dueAmount: 14000,
      status: "PARTIAL",
      notes: "চট্টগ্রামে ২৮ চাল পাইকারি চালান",
      items: { create: [{ itemId: rice2.id, quantity: 10000, rate: 58, amount: 580000 }] },
    },
  });

  // বিক্রি ৩ (Month -2)
  await prisma.sale.create({
    data: {
      receiptNo: `SAL-${now.getFullYear()}-0003`,
      date: sm2,
      customerId: cus3.id,
      subtotal: 624000,
      totalAmount: 624000,
      paidAmount: 624000,
      dueAmount: 0,
      status: "PAID",
      notes: "সিলেটে স্বর্ণা চাল পাইকারি চালান",
      items: { create: [{ itemId: rice3.id, quantity: 12000, rate: 52, amount: 624000 }] },
    },
  });

  // বিক্রি ৪ (Month -1)
  await prisma.sale.create({
    data: {
      receiptNo: `SAL-${now.getFullYear()}-0004`,
      date: sm1,
      customerId: cus1.id,
      subtotal: 680000,
      totalAmount: 680000,
      paidAmount: 655500,
      dueAmount: 24500,
      status: "PARTIAL",
      notes: "ঢাকায় মিনিকেট প্রিমিয়াম চাল ডেলিভারি",
      items: { create: [{ itemId: rice1.id, quantity: 10000, rate: 68, amount: 680000 }] },
    },
  });

  // বিক্রি ৫ (Current Month)
  await prisma.sale.create({
    data: {
      receiptNo: `SAL-${now.getFullYear()}-0005`,
      date: sm0a,
      customerId: cus2.id,
      subtotal: 464000,
      totalAmount: 464000,
      paidAmount: 464000,
      dueAmount: 0,
      status: "PAID",
      notes: "চট্টগ্রামে ২৮ চাল ও গুঁড়া ডেলিভারি",
      items: {
        create: [
          { itemId: rice2.id, quantity: 7000, rate: 58, amount: 406000 },
          { itemId: gura.id, quantity: 80, rate: 650, amount: 52000 },
          { itemId: khud.id, quantity: 157, rate: 38, amount: 6000 },
        ],
      },
    },
  });

  // ৯. মিলিং প্রোডাকশন ব্যাচসমূহ (Production Milling Batches)
  const bDate1 = new Date(now.getFullYear(), now.getMonth() - 1, 5);
  const bDate2 = new Date(now.getFullYear(), now.getMonth(), 2);

  await prisma.productionBatch.create({
    data: {
      batchNo: `BAT-${now.getFullYear()}-0001`,
      date: bDate1,
      machineId: huller.id,
      operatorId: operator.id,
      startedAt: new Date(bDate1.getTime() - 4 * 3600 * 1000),
      endedAt: bDate1,
      status: "COMPLETED",
      recoveryRate: 66.5,
      notes: "২০০ মণ মিনিকেট ধান মিলিং সম্পন্ন",
      inputs: {
        create: [{ itemId: paddy1.id, quantity: 200 }],
      },
      outputs: {
        create: [
          { itemId: rice1.id, quantity: 5320 }, // 66.5% of 8,000 kg
          { itemId: gura.id, quantity: 30 },
          { itemId: khud.id, quantity: 450 },
          { itemId: tush.id, quantity: 60 },
        ],
      },
    },
  });

  await prisma.productionBatch.create({
    data: {
      batchNo: `BAT-${now.getFullYear()}-0002`,
      date: bDate2,
      machineId: huller.id,
      operatorId: operator.id,
      startedAt: new Date(bDate2.getTime() - 3.5 * 3600 * 1000),
      endedAt: bDate2,
      status: "COMPLETED",
      recoveryRate: 65.0,
      notes: "১৫০ মণ ২৮ ধান প্রসেসিং সম্পন্ন",
      inputs: {
        create: [{ itemId: paddy2.id, quantity: 150 }],
      },
      outputs: {
        create: [
          { itemId: rice2.id, quantity: 3900 }, // 65% of 6,000 kg
          { itemId: gura.id, quantity: 22 },
          { itemId: khud.id, quantity: 320 },
          { itemId: tush.id, quantity: 45 },
        ],
      },
    },
  });

  // ১০. কারখানা খরচ ও ইউটিলিটি (Expenses)
  await prisma.expense.create({
    data: {
      category: "বিদ্যুৎ",
      amount: 28500,
      paymentMethod: "BANK",
      description: "চলতি মাসের ইন্ডাস্ট্রিয়াল ৩-ফেজ বিদ্যুৎ বিল (PDB)",
      date: new Date(now.getFullYear(), now.getMonth(), 10),
    },
  });

  await prisma.expense.create({
    data: {
      category: "পরিবহন",
      amount: 12400,
      paymentMethod: "CASH",
      description: "দিনাজপুর থেকে ধান আনয়ন ট্রাক ভাড়া",
      date: new Date(now.getFullYear(), now.getMonth(), 14),
    },
  });

  await prisma.expense.create({
    data: {
      category: "মেরামত",
      amount: 4500,
      paymentMethod: "CASH",
      description: "হালার মিল বেল্ট পরিবর্তন ও মেইনটেন্যান্স",
      date: new Date(now.getFullYear(), now.getMonth(), 18),
    },
  });

  // ক্যাশ জমাদান (ব্যাংকে/মালিকের কাছে ক্যাশ ফান্ড স্থানান্তর)
  await prisma.expense.create({
    data: {
      category: "ক্যাশ জমা",
      amount: 150000,
      paymentMethod: "BANK",
      description: "ব্যাংক কারেন্ট একাউন্টে নিট সেলস ক্যাশ জমা",
      date: new Date(now.getFullYear(), now.getMonth(), 25),
    },
  });

  // ১১. কর্মীবাহিনী ও পে-রোল (Workforce Members & Salary)
  const w1 = await prisma.workforceMember.create({
    data: { name: "আব্দুল মালেক", phone: "01755112233", designation: "ড্রায়ার হেড কারিগর", rateType: "DAILY", rateAmount: 700, balance: 1400 },
  });
  const w2 = await prisma.workforceMember.create({
    data: { name: "মোঃ লিটন মিয়া", phone: "01755112234", designation: "চাল বস্তা লোডার", rateType: "PIECE", rateAmount: 12, balance: 850 },
  });
  const w3 = await prisma.workforceMember.create({
    data: { name: "সুজন চন্দ্র", phone: "01755112235", designation: "মিলিং হেলপার", rateType: "DAILY", rateAmount: 550, balance: 0 },
  });

  await prisma.workforceTransaction.create({
    data: { workforceMemberId: w1.id, type: "BILL", amount: 4900, description: "৭ দিনের শ্রম বিল" },
  });
  await prisma.workforceTransaction.create({
    data: { workforceMemberId: w1.id, type: "PAYMENT", amount: 3500, paymentMethod: "CASH", description: "সাপ্তাহিক মজুরি আংশিক প্রদান" },
  });

  await prisma.workforceTransaction.create({
    data: { workforceMemberId: w2.id, type: "BILL", amount: 2450, description: "২০৫ বস্তা চাল লোডিং বিল" },
  });
  await prisma.workforceTransaction.create({
    data: { workforceMemberId: w2.id, type: "PAYMENT", amount: 1600, paymentMethod: "CASH", description: "মজুরি প্রদান" },
  });

  // ১২. মেশিন সেন্ট্রাল লগ
  for (const m of [boiler, dryer, huller]) {
    await prisma.machineLog.create({
      data: {
        machineId: m.id,
        status: "RUNNING",
        temperature: 48.2,
        vibration: 1.8,
        powerKw: 22.5,
        rpm: 1440,
        throughput: m.capacityPerHr ?? 40,
        note: "নরমাল স্মুথ অপারেশন",
      },
    });
  }

  console.log("🎉 অভিনন্দিত! ডাটাবেজ সম্পূর্ণ রিসেট করে ফ্রেশ ও বাস্তবসম্মত ডেটা দিয়ে সিমুলেট করা হয়েছে!");
  console.log("🔑 অ্যাডমিন লগইন: owner@niceplr.bd / admin123");
}

main()
  .catch((e) => {
    console.error("❌ সিডিং ভুল:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
