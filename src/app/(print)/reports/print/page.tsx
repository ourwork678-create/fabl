/* eslint-disable @next/next/no-img-element */
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTaka } from "@/lib/utils";
import { generateQRCodeDataURL } from "@/lib/qrcode";
import { t, lbl, type Locale } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { AutoPrint } from "@/components/AutoPrint";
import { PrintToolbar } from "@/components/PrintToolbar";
import { DataTable } from "@/components/DataTable";

export default async function ReportsPrintPage({
  searchParams,
}: {
  searchParams: { start?: string; end?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const lang = await getLang();
  const isEn = lang === "en";

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startDate = searchParams.start ? new Date(searchParams.start + "T00:00:00") : defaultStart;
  const endDate = searchParams.end ? new Date(searchParams.end + "T00:00:00") : defaultEnd;
  // half-open রেঞ্জ [start, end+1day) — দিনের শেষ মুহূর্ত পর্যন্ত সব রেকর্ড ধরা পড়ে
  const endExclusive = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);

  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
  const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  const host = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${host}/reports?start=${startStr}&end=${endStr}`;
  const qrCodeDataUrl = await generateQRCodeDataURL(verifyUrl);

  const [sales, purchases, expenses, salaries, workerPayments] = await Promise.all([
    prisma.sale.findMany({
      where: { date: { gte: startDate, lt: endExclusive }, status: { not: "CANCELLED" } },
      include: { customer: true },
      orderBy: { date: "desc" },
    }),
    prisma.purchase.findMany({
      where: { date: { gte: startDate, lt: endExclusive }, status: { not: "CANCELLED" } },
      include: { supplier: true },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: { date: { gte: startDate, lt: endExclusive } },
      orderBy: { date: "desc" },
    }),
    prisma.salary.findMany({
      where: { paidDate: { gte: startDate, lt: endExclusive }, status: "PAID" },
      include: { user: true },
      orderBy: { paidDate: "desc" },
    }),
    prisma.workforceTransaction.findMany({
      where: { date: { gte: startDate, lt: endExclusive }, type: "PAYMENT" },
      include: { workforceMember: true },
      orderBy: { date: "desc" },
    }),
  ]);

  // ক্যাশ জমা বাদ; কর্মী-পেমেন্টের সাথে যুক্ত (linked) খরচও বাদ (workerPayments-এ গণনা হয়, ডাবল কাউন্ট এড়াতে)।
  // ম্যানুয়ালি দেওয়া "শ্রম" ক্যাটাগরির খরচ সাধারণ খরচেই গণনা হবে।
  const linkedExpenseIds = new Set(
    workerPayments.map((w) => w.linkedExpenseId).filter(Boolean)
  );
  const generalExpenses = expenses.filter((e) => e.category !== "ক্যাশ জমা" && !linkedExpenseIds.has(e.id));
  const cashDepositExpenses = expenses.filter((e) => e.category === "ক্যাশ জমা");

  const totalSales = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const totalGeneralExpenses = generalExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalSalaries = salaries.reduce((sum, s) => sum + Number(s.netAmount), 0);
  const totalWorkerPayments = workerPayments.reduce((sum, w) => sum + Number(w.amount), 0);
  const totalCashDeposited = cashDepositExpenses.reduce((sum, c) => sum + Number(c.amount), 0);

  // নগদ প্রাপ্তি/প্রদান — বাকির অপরিশোধিত অংশ বাদ, শুধু আসলে পরিশোধিত টাকা (ক্যাশ হিসাবের জন্য)
  const totalSalesCash = sales.reduce((sum, s) => sum + Number(s.paidAmount), 0);
  const totalPurchasesCash = purchases.reduce((sum, p) => sum + Number(p.paidAmount), 0);

  const totalOutflows = totalPurchases + totalGeneralExpenses + totalSalaries + totalWorkerPayments;
  const netProfit = totalSales - totalOutflows;
  // ক্যাশ (হাতে থাকা নিট ক্যাশ) = নগদ প্রাপ্তি − নগদ প্রদান − ক্যাশ জমাদান
  // বাকির অপরিশোধিত অংশ এখানে ধরা হয় না; পরে পরিশোধ হলে paidAmount-এ যুক্ত হয়ে হিসাবে আসে।
  const netCashFund =
    totalSalesCash -
    (totalPurchasesCash + totalGeneralExpenses + totalSalaries + totalWorkerPayments) -
    totalCashDeposited;

  const otherCosts = [
    ...salaries.map((s) => ({
      id: s.id,
      date: s.paidDate || s.createdAt,
      category: isEn ? "Salary" : "বেতন",
      name: s.user?.name ?? "—",
      amount: Number(s.netAmount),
      description: `${s.month} - ${isEn ? "Salary payout" : "মাসিক বেতন প্রদান"}`,
    })),
    ...workerPayments.map((w) => ({
      id: w.id,
      date: w.date,
      category: isEn ? "Worker Payment" : "কর্মী মজুরি প্রদান",
      name: w.workforceMember?.name ?? "—",
      amount: Number(w.amount),
      description: w.description || (isEn ? "Worker wage payment" : "কর্মী মজুরি প্রদান"),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="mx-auto max-w-3xl p-6 bg-white min-h-screen font-invoice">
      <AutoPrint />
      
      {/* স্ক্রিন কন্ট্রোল বার */}
      <PrintToolbar />

      {/* মেমো প্যাড */}
      <div className="border border-gray-300 p-8 rounded-lg shadow-sm">
        {/* মিল হেডার */}
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              নিশাত অটো রাইস মিল
            </h1>
            <p className="text-sm font-medium text-gray-600 mt-1">
              উন্নত মানের চাল ও তুষ বিক্রেতা
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              হাবু তাঁতীপাড়া, গজঘণ্টা, রংপুর। মোবাইলঃ 01700000000
            </p>
            <div className="mt-2 inline-block bg-gray-900 text-white text-xs uppercase font-bold tracking-widest px-3 py-1 rounded">
              {t(lang, "reports.summary")}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {t(lang, "reports.startDate")}: {formatDate(startDate, lang)} | {t(lang, "reports.endDate")}: {formatDate(endDate, lang)}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center text-center pl-4 border-l">
            {qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="Report Verification QR Code" className="w-20 h-20 border border-slate-200 p-1 rounded" />
            )}
            <span className="text-[10px] text-gray-500 mt-1 leading-tight">
              রিপোর্ট যাচাইয়ের QR কোড
            </span>
          </div>
        </div>

        {/* রেকনসাইল্ড সমারি কার্ডসমূহ */}
        <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4 text-xs">
          <div className="border p-3 rounded bg-gray-50">
            <p className="text-gray-500">{t(lang, "acc.totalSale")}</p>
            <p className="text-base font-bold text-emerald-700">{formatTaka(totalSales, lang)}</p>
          </div>
          <div className="border p-3 rounded bg-gray-50">
            <p className="text-gray-500">{isEn ? "Total Outflows" : "মোট কার্যকর ব্যয়"}</p>
            <p className="text-base font-bold text-red-700">{formatTaka(totalOutflows, lang)}</p>
          </div>
          <div className="border p-3 rounded bg-gray-50">
            <p className="text-gray-500">{t(lang, "acc.netProfit")}</p>
            <p className={`text-base font-bold ${netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {formatTaka(netProfit, lang)}
            </p>
          </div>
          <div className="border p-3 rounded bg-gray-50">
            <p className="text-gray-500">{isEn ? "Net Fund (Cash+Bank)" : "নিট তহবিল (নগদ+ব্যাংক)"}</p>
            <p className="text-base font-bold text-indigo-700">{formatTaka(netCashFund, lang)}</p>
          </div>
        </div>

        {/* বিস্তারিত বিভাগসমূহ */}
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="font-bold border-b pb-1 mb-2 text-gray-900">
              ১. {isEn ? "Sales Statement" : "বিক্রয় বিবরণী"} ({sales.length}টি)
            </h3>
            <DataTable
              data={sales}
              empty={t(lang, "sale.empty")}
              columns={[
                { key: "date", header: t(lang, "sale.date"), render: (s) => formatDate(s.date, lang) },
                { key: "receiptNo", header: t(lang, "sale.receiptNo"), render: (s) => <span className="font-mono text-xs">{s.receiptNo}</span> },
                { key: "customer", header: t(lang, "sale.customer"), render: (s) => s.customer?.name ?? "—" },
                { key: "totalAmount", header: t(lang, "sale.total"), render: (s) => formatTaka(s.totalAmount, lang) },
                { key: "paidAmount", header: t(lang, "sale.paid"), render: (s) => formatTaka(s.paidAmount, lang) },
              ]}
            />
          </div>

          <div>
            <h3 className="font-bold border-b pb-1 mb-2 text-gray-900">
              ২. {isEn ? "Purchase Statement" : "ক্রয় বিবরণী"} ({purchases.length}টি)
            </h3>
            <DataTable
              data={purchases}
              empty={t(lang, "pur.empty")}
              columns={[
                { key: "date", header: t(lang, "pur.date"), render: (p) => formatDate(p.date, lang) },
                { key: "receiptNo", header: t(lang, "pur.receiptNo"), render: (p) => <span className="font-mono text-xs">{p.receiptNo}</span> },
                { key: "supplier", header: t(lang, "pur.supplier"), render: (p) => p.supplier?.name ?? "—" },
                { key: "totalAmount", header: t(lang, "pur.total"), render: (p) => formatTaka(p.totalAmount, lang) },
                { key: "paidAmount", header: t(lang, "pur.paid"), render: (p) => formatTaka(p.paidAmount, lang) },
              ]}
            />
          </div>

          <div>
            <h3 className="font-bold border-b pb-1 mb-2 text-gray-900">
              ৩. {isEn ? "General Expense Statement" : "সাধারণ পরিচালনা খরচ বিবরণী"} ({generalExpenses.length}টি)
            </h3>
            <DataTable
              data={generalExpenses}
              empty={isEn ? "No general expenses found" : "কোনো সাধারণ খরচের হিসাব নেই"}
              columns={[
                { key: "date", header: t(lang, "pur.date"), render: (e) => formatDate(e.date, lang) },
                { key: "category", header: t(lang, "acc.category"), render: (e) => lbl("expenseCategory", e.category, lang as Locale) },
                { key: "amount", header: t(lang, "acc.amount"), render: (e) => formatTaka(e.amount, lang) },
                { key: "description", header: isEn ? "Description" : "বিবরণ", render: (e) => e.description || "—" },
              ]}
            />
          </div>

          <div>
            <h3 className="font-bold border-b pb-1 mb-2 text-gray-900">
              ৪. {isEn ? "Salaries & Worker Payments" : "বেতন ও কর্মী মজুরি"} ({otherCosts.length}টি)
            </h3>
            <DataTable
              data={otherCosts}
              empty={isEn ? "No entries found" : "কোনো এন্ট্রি পাওয়া যায়নি"}
              columns={[
                { key: "date", header: t(lang, "pur.date"), render: (c) => formatDate(c.date, lang) },
                { key: "category", header: isEn ? "Type" : "ধরন", render: (c) => c.category },
                { key: "name", header: isEn ? "Recipient" : "গ্রহীতা", render: (c) => c.name },
                { key: "amount", header: t(lang, "acc.amount"), render: (c) => formatTaka(c.amount, lang) },
              ]}
            />
          </div>
        </div>

        {/* সিগনেচার এরিয়া */}
        <div className="flex justify-between mt-16 text-xs text-gray-600 pt-8 px-4">
          <div className="text-center">
            <div className="w-32 border-t border-gray-400 pt-1.5">হিসাবরক্ষক</div>
          </div>
          <div className="text-center">
            <div className="w-32 border-t border-gray-400 pt-1.5">ব্যবস্থাপক</div>
          </div>
          <div className="text-center">
            <div className="w-32 border-t border-gray-400 pt-1.5">অনুমোদিত স্বাক্ষর</div>
          </div>
        </div>
      </div>
    </div>
  );
}
