import { getServerSession } from "next-auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { t, lbl } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { Card, PageHeader } from "@/components/ui";
import { formatTaka, formatNumber, formatDate } from "@/lib/utils";
import { DashboardChart } from "./DashboardChart";
import {
  Wheat,
  UserCheck,
  Zap,
  Cog,
  Package,
  Factory,
  Store,
  Boxes,
  Users,
  Truck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  PackageCheck,
  Layers,
  Grid,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const lang = await getLang();

  // চার্টে বিগত ৪ মাস + চলতি মাস দেখানো হয়, তাই ৫ মাসের ডেটাই আনা হয়
  const chartWindowStart = new Date();
  chartWindowStart.setMonth(chartWindowStart.getMonth() - 4);
  chartWindowStart.setDate(1);
  chartWindowStart.setHours(0, 0, 0, 0);

  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    todayStart,
    purchases,
    sales,
    lowStockItems,
    runningBatches,
    machines,
    customersDue,
    suppliersDue,
    workforceDue,
    salesList,
    purchasesList,
    paddyItems,
    riceItems,
    byproductItems,
    byproductSales,
    monthlyBatches,
    guraItems,
    khudItems,
    totalSuppliersCount,
    totalCustomersCount,
  ] = await Promise.all([
    Promise.resolve(new Date(new Date().setHours(0, 0, 0, 0))),
    prisma.purchase.aggregate({ _sum: { totalAmount: true } }),
    prisma.sale.aggregate({ _sum: { totalAmount: true } }),
    prisma.inventoryItem.findMany({
      where: { currentStock: { lte: prisma.inventoryItem.fields.minStock }, minStock: { gt: 0 } },
      orderBy: { currentStock: "asc" },
      take: 5,
    }),
    prisma.productionBatch.count({ where: { status: "RUNNING" } }),
    prisma.machine.findMany(),
    prisma.customer.aggregate({ _sum: { dueAmount: true } }),
    prisma.supplier.aggregate({ _sum: { dueAmount: true } }),
    prisma.workforceTransaction.aggregate({ _sum: { amount: true }, where: { type: "PAYMENT" } }),
    prisma.sale.findMany({
      where: { date: { gte: chartWindowStart } },
      select: { date: true, totalAmount: true },
    }),
    prisma.purchase.findMany({
      where: { date: { gte: chartWindowStart } },
      select: { date: true, totalAmount: true },
    }),
    prisma.inventoryItem.aggregate({ _sum: { currentStock: true }, where: { type: "PADDY" } }),
    prisma.inventoryItem.findMany({ where: { type: "RICE" } }),
    prisma.inventoryItem.aggregate({ _sum: { currentStock: true }, where: { type: "BYPRODUCT" } }),
    prisma.saleItem.aggregate({ _sum: { amount: true }, where: { item: { type: "BYPRODUCT" } } }),
    prisma.productionBatch.findMany({
      where: { date: { gte: firstDayOfMonth }, status: { not: "CANCELLED" } },
      select: { status: true, recoveryRate: true },
    }),
    prisma.inventoryItem.aggregate({
      _sum: { currentStock: true },
      where: {
        type: "BYPRODUCT",
        OR: [
          { name: { contains: "গুঁড়া" } },
          { name: { contains: "কুঁড়া" } },
          { name: { contains: "Bran" } },
        ],
      },
    }),
    prisma.inventoryItem.aggregate({
      _sum: { currentStock: true },
      where: {
        type: "BYPRODUCT",
        OR: [
          { name: { contains: "খুদ" } },
          { name: { contains: "Broken" } },
        ],
      },
    }),
    prisma.supplier.count(),
    prisma.customer.count(),
  ]);

  const totalPurchase = purchases._sum.totalAmount ?? 0;
  const totalSale = sales._sum.totalAmount ?? 0;
  const totalCustomerDue = customersDue._sum.dueAmount ?? 0;
  const totalSupplierDue = suppliersDue._sum.dueAmount ?? 0;
  const totalWorkforcePaid = workforceDue._sum.amount ?? 0;
  const totalByproductSales = byproductSales._sum.amount ?? 0;
  const totalGuraStock = Math.max(0, Number(guraItems._sum.currentStock ?? 0));
  const totalKhudStock = Math.max(0, Number(khudItems._sum.currentStock ?? 0));
  const rawPaddyStock = Number(paddyItems._sum.currentStock ?? 0);
  const totalPaddyStock = Math.max(0, rawPaddyStock);

  // চালের স্টক কেজিতে হিসাব (১ বস্তা ৫০ কেজির চাল = ৫০ কেজি, ১ মণ = ৪০ কেজি, ১ কেজি = ১ কেজি)
  const totalRiceStock = riceItems.reduce((sum, item) => {
    const stock = Number(item.currentStock || 0);
    const unit = (item.unit || "").trim();

    if (unit === "বস্তা" || unit.toLowerCase() === "bag" || unit.toLowerCase() === "bags") {
      return sum + (stock * 50);
    } else if (unit === "মণ" || unit.toLowerCase() === "maund") {
      return sum + (stock * 40);
    } else {
      return sum + stock;
    }
  }, 0);

  const sortedTopRice = [...riceItems]
    .map((item) => {
      const stock = Number(item.currentStock || 0);
      const unit = (item.unit || "").trim();
      let stockInKg = stock;
      if (unit === "বস্তা" || unit.toLowerCase() === "bag" || unit.toLowerCase() === "bags") {
        stockInKg = stock * 50;
      } else if (unit === "মণ" || unit.toLowerCase() === "maund") {
        stockInKg = stock * 40;
      }
      return { ...item, stockInKg };
    })
    .sort((a, b) => b.stockInKg - a.stockInKg)
    .slice(0, 2);

  const monthlyBatchCount = monthlyBatches.length;
  const validRates = monthlyBatches
    .filter((b) => b.recoveryRate !== null && b.recoveryRate !== undefined)
    .map((b) => Number(b.recoveryRate));
  const avgRecoveryRate = validRates.length > 0
    ? (validRates.reduce((a, b) => a + b, 0) / validRates.length).toFixed(1)
    : null;
  
  // Filter machinery only (excluding tools/materials underneath)
  const isMachinery = (type: string | null) => {
    if (!type) return false;
    const t = type.trim().toLowerCase();
    return (
      t === "মেশিন" ||
      t === "machine" ||
      t === "dryer" ||
      t === "polisher" ||
      t === "boiler" ||
      t === "huller" ||
      t === "grader" ||
      t === "whitener"
    );
  };

  const machineryList = machines.filter((m) => isMachinery(m.type));
  const totalMachines = machineryList.length;
  const runningMachines = machineryList.filter((m) => m.status === "RUNNING").length;
  const totalByproductStock = byproductItems._sum.currentStock ?? 0;

  // বিগত ৪ মাস, চলতি মাস এবং আগামী ১ মাসের ধারাবাহিক তালিকা তৈরি
  const monthNamesBn = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ];
  const monthNamesEn = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // বিগত ৪ মাস এবং চলতি মাসের ধারাবাহিক তালিকা তৈরি (আগামী মাস বাদ)
  const monthsList: { key: string; label: string; sales: number; purchases: number }[] = [];
  const now = new Date();
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthIdx = d.getMonth();
    const label = lang === "en" ? monthNamesEn[monthIdx] : monthNamesBn[monthIdx];
    monthsList.push({ key: monthKey, label, sales: 0, purchases: 0 });
  }

  salesList.forEach((s) => {
    const mKey = `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, "0")}`;
    const found = monthsList.find((m) => m.key === mKey);
    if (found) found.sales += Number(s.totalAmount);
  });

  purchasesList.forEach((p) => {
    const mKey = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, "0")}`;
    const found = monthsList.find((m) => m.key === mKey);
    if (found) found.purchases += Number(p.totalAmount);
  });

  const chartData = monthsList.map((m) => ({
    month: m.label,
    sales: m.sales,
    purchases: m.purchases,
  }));

  const isDemo = salesList.length === 0 && purchasesList.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={lang === "en" ? "Factory Operational Overview" : "অটো রাইস মিল ওভারভিউ (ফ্যাক্টরি ফ্লো)"}
        subtitle={`${t(lang, "dashboard.welcome")}, ${session?.user?.name ?? ""} | ${formatDate(todayStart, lang)}`}
      />

      {/* ১. FACTORY FLOW PIPELINE (ইনপুট ➔ বর্তমান অবস্থা ➔ আউটপুট) */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Step 1: Inputs */}
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/70 to-orange-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-xs">১</div>
              <h3 className="font-bold text-amber-900 text-sm">
                {lang === "en" ? "1. Factory Inputs (Costs & Purchases)" : "১. ফ্যাক্টরি ইনপুট (ব্যয় ও ক্রয়)"}
              </h3>
            </div>
            <Link href="/purchases/new" className="text-amber-700 hover:text-amber-900 transition-colors">
              <PlusCircle size={18} />
            </Link>
          </div>
          <div className="space-y-2 text-xs">
            <Link href="/purchases" className="flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white shadow-2xs border border-amber-100">
              <span className="flex items-center gap-2 text-slate-700">
                <Wheat size={14} className="text-amber-600" />
                {lang === "en" ? "Paddy Purchase" : "ধান ক্রয়"}
              </span>
              <span className="font-bold text-amber-800">{formatTaka(totalPurchase, lang)}</span>
            </Link>

            <Link href="/workforce" className="flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white shadow-2xs border border-amber-100">
              <span className="flex items-center gap-2 text-slate-700">
                <UserCheck size={14} className="text-indigo-600" />
                {lang === "en" ? "Labor Payments" : "কর্মী মজুরি পরিশোধ"}
              </span>
              <span className="font-bold text-indigo-700">{formatTaka(totalWorkforcePaid, lang)}</span>
            </Link>

            <Link href="/machines" className="flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white shadow-2xs border border-amber-100">
              <span className="flex items-center gap-2 text-slate-700">
                <Cog size={14} className="text-slate-600" />
                {lang === "en" ? "Running Machines" : "চলমান মেশিন"}
              </span>
              <span className="font-bold text-slate-800">{runningMachines} / {totalMachines}</span>
            </Link>
          </div>
        </div>

        {/* Step 2: Present State */}
        <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-b from-purple-50/70 to-indigo-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-purple-200/60 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white font-bold text-xs">২</div>
              <h3 className="font-bold text-purple-900 text-sm">
                {lang === "en" ? "2. Current State (Stock & Milling)" : "২. বর্তমান অবস্থা (স্টক ও প্রসেসিং)"}
              </h3>
            </div>
            <Link href="/production/new" className="text-purple-700 hover:text-purple-900 transition-colors">
              <PlusCircle size={18} />
            </Link>
          </div>
          <div className="space-y-2 text-xs">
            <Link href="/inventory" className="flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white shadow-2xs border border-purple-100">
              <span className="flex items-center gap-2 text-slate-700">
                <Wheat size={14} className="text-amber-600" />
                {lang === "en" ? "Paddy Stock" : "ধানের মজুদ"}
              </span>
              <span className="font-bold text-amber-700">{formatNumber(totalPaddyStock, lang)} {lang === "en" ? "Maund" : "মণ"}</span>
            </Link>

            <Link href="/production" className="flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white shadow-2xs border border-purple-100">
              <span className="flex items-center gap-2 text-slate-700">
                <Factory size={14} className="text-purple-600" />
                {lang === "en" ? "This Month's Milling" : "চলতি মাসের মিলিং"}
              </span>
              <span className="font-bold text-purple-800">
                {avgRecoveryRate ? `${formatNumber(avgRecoveryRate, lang)}% (${formatNumber(monthlyBatchCount, lang)} ${lang === "en" ? "batches" : "ব্যাচ"})` : `${formatNumber(monthlyBatchCount, lang)} ${lang === "en" ? "batches" : "ব্যাচ"}`}
              </span>
            </Link>

            <Link href="/inventory" className="flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white shadow-2xs border border-purple-100">
              <span className="flex items-center gap-2 text-slate-700">
                <Package size={14} className="text-emerald-600" />
                {lang === "en" ? "Rice Stock" : "চালের মজুদ"}
              </span>
              <span className="font-bold text-emerald-700">{formatNumber(totalRiceStock, lang)} {lang === "en" ? "Kg" : "কেজি"}</span>
            </Link>
          </div>
        </div>

        {/* Step 3: Outputs */}
        <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-b from-sky-50/70 to-blue-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-sky-200/60 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2664F5] text-white font-bold text-xs">৩</div>
              <h3 className="font-bold text-sky-900 text-sm">
                {lang === "en" ? "3. Factory Outputs (Sales & Revenue)" : "৩. ফ্যাক্টরি আউটপুট (বিক্রয় ও আয়)"}
              </h3>
            </div>
            <Link href="/sales/new" className="text-sky-700 hover:text-sky-900 transition-colors">
              <PlusCircle size={18} />
            </Link>
          </div>
          <div className="space-y-2 text-xs">
            <Link href="/sales" className="flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white shadow-2xs border border-sky-100">
              <span className="flex items-center gap-2 text-slate-700">
                <Store size={14} className="text-sky-600" />
                {lang === "en" ? "Total Sales" : "মোট বিক্রয়"}
              </span>
              <span className="font-bold text-sky-800">{formatTaka(totalSale, lang)}</span>
            </Link>
            <Link href="/byproducts" className="flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white shadow-2xs border border-sky-100">
              <span className="flex items-center gap-2 text-slate-700">
                <Boxes size={14} className="text-teal-600" />
                {lang === "en" ? "Byproduct Sales" : "মোট উপজাত বিক্রি"}
              </span>
              <span className="font-bold text-teal-700">{formatTaka(totalByproductSales, lang)}</span>
            </Link>

            <Link href="/customers" className="flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white shadow-2xs border border-sky-100">
              <span className="flex items-center gap-2 text-slate-700">
                <Users size={14} className="text-amber-600" />
                {lang === "en" ? "Receivable from Customers" : "কাস্টমার এর কাছে পাওনা"}
              </span>
              <span className="font-bold text-amber-700">{formatTaka(totalCustomerDue, lang)}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ২. CHART & LEDGERS */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          <DashboardChart data={chartData} isDemo={isDemo} />

          {/* সবচেয়ে বেশি মজুদ থাকা চালের ২ টি হালকা হলুদ ও সবুজ রেসপন্সিভ কার্ড */}
          {sortedTopRice.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedTopRice.map((item, idx) => (
                <Card
                  key={item.id}
                  className={
                    idx === 0
                      ? "bg-gradient-to-br from-amber-50/80 to-yellow-50/40 border border-amber-200/80 p-5 min-h-[146px] flex flex-col justify-center shadow-2xs"
                      : "bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-200/80 p-5 min-h-[146px] flex flex-col justify-center shadow-2xs"
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 truncate max-w-[200px]" title={item.name}>
                        {item.name} {lang === "en" ? "Stock" : "মজুদ"}
                      </p>
                      <p className={`text-xl sm:text-2xl font-bold mt-1 ${idx === 0 ? "text-amber-900" : "text-emerald-900"}`}>
                        {formatNumber(item.stockInKg, lang)} {lang === "en" ? "Kg" : "কেজি"}
                      </p>
                    </div>
                    <Link
                      href="/inventory"
                      className={`p-2.5 rounded-xl transition-colors ${
                        idx === 0
                          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                    >
                      {idx === 0 ? <Wheat size={22} /> : <Store size={22} />}
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-4">
          {/* Low Stock Alerts / Stock Checker */}
          <Card>
            <div className="mb-3 flex items-center gap-2 border-b pb-2">
              <PackageCheck size={18} className="text-amber-500" />
              <h2 className="font-semibold text-sm">{t(lang, "dashboard.lowStock")}</h2>
            </div>
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-gray-500">{t(lang, "dashboard.stockOk")}</p>
            ) : (
              <ul className="space-y-2">
                {lowStockItems.map((item) => {
                  const unitStr = item.unit === "মণ" ? (lang === "en" ? "Maund" : "মণ") : item.unit === "বস্তা" ? (lang === "en" ? "Bags" : "বস্তা") : item.unit === "কেজি" ? (lang === "en" ? "Kg" : "কেজি") : item.unit;
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-amber-50/80 px-3 py-1.5 text-xs"
                    >
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <span className="text-amber-700 font-semibold">
                        {formatNumber(item.currentStock, lang)} {unitStr}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* মোট গুঁড়ার মজুদ Card */}
          <Card className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{lang === "en" ? "Total Rice Bran Stock" : "মোট গুঁড়ার মজুদ"}</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatNumber(totalGuraStock, lang)} {lang === "en" ? "Bags" : "বস্তা"}</p>
              </div>
              <Link href="/inventory" className="p-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                <Boxes size={18} />
              </Link>
            </div>
          </Card>

          {/* মোট খুদের মজুদ Card */}
          <Card className="bg-gradient-to-br from-amber-50/50 to-yellow-50/30 border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{lang === "en" ? "Total Broken Rice Stock" : "মোট খুদের মজুদ"}</p>
                <p className="text-lg font-bold text-amber-700 mt-0.5">{formatNumber(totalKhudStock, lang)} {lang === "en" ? "Kg" : "কেজি"}</p>
              </div>
              <Link href="/inventory" className="p-2 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                <Layers size={18} />
              </Link>
            </div>
          </Card>

          {/* Supplier Dues Card */}
          <Card className="bg-gradient-to-br from-red-50/50 to-orange-50/30 border border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{t(lang, "dashboard.supplierDue")}</p>
                <p className="text-lg font-bold text-red-600 mt-0.5">{formatTaka(totalSupplierDue, lang)}</p>
              </div>
              <Link href="/suppliers" className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                <Truck size={18} />
              </Link>
            </div>
          </Card>

          {/* মোট সাপ্লায়ার Card */}
          <Card className="bg-gradient-to-br from-purple-50/50 to-indigo-50/30 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{lang === "en" ? "Total Suppliers" : "মোট সাপ্লায়ার"}</p>
                <p className="text-lg font-bold text-purple-700 mt-0.5">{formatNumber(totalSuppliersCount, lang)} {lang === "en" ? "suppliers" : "জন"}</p>
              </div>
              <Link href="/suppliers" className="p-2 rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">
                <UserCheck size={18} />
              </Link>
            </div>
          </Card>

          {/* মোট কাস্টমার Card */}
          <Card className="bg-gradient-to-br from-sky-50/50 to-blue-50/30 border border-sky-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{lang === "en" ? "Total Customers" : "মোট কাস্টমার"}</p>
                <p className="text-lg font-bold text-sky-700 mt-0.5">{formatNumber(totalCustomersCount, lang)} {lang === "en" ? "customers" : "জন"}</p>
              </div>
              <Link href="/customers" className="p-2 rounded-xl bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors">
                <Users size={18} />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

