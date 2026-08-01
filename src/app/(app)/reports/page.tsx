import Link from "next/link";
import { Printer, Wallet, FileText, ArrowUpRight, DollarSign } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { formatTaka, formatDate } from "@/lib/utils";
import { t, lbl, type Locale } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { ExpenseForm } from "./ExpenseForm";
import { CashDepositForm } from "./CashDepositForm";

function formatDateInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { start?: string; end?: string };
}) {
  const lang = await getLang();
  const isEn = lang === "en";

  // ডিফল্টভাবে চলতি মাসের ১ম দিন থেকে আজ পর্যন্ত
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startDate = searchParams.start ? new Date(searchParams.start + "T00:00:00") : defaultStart;
  const endDate = searchParams.end ? new Date(searchParams.end + "T00:00:00") : defaultEnd;
  // half-open রেঞ্জ [start, end+1day) — দিনের শেষ মুহূর্ত পর্যন্ত সব রেকর্ড ধরা পড়ে
  const endExclusive = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);

  const startStr = formatDateInput(startDate);
  const endStr = formatDateInput(endDate);

  const [sales, purchases, expenses, salaries, workerPayments, recentExpenses] = await Promise.all([
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
    prisma.expense.findMany({ orderBy: { date: "desc" }, take: 10 }),
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

  // নিট আয়/লাভ = বিক্রয় - (ক্রয় + সাধারণ খরচ + বেতন + কর্মী মজুরি প্রদান)
  const netProfit = totalSales - (totalPurchases + totalGeneralExpenses + totalSalaries + totalWorkerPayments);
  
  // ক্যাশ (হাতে থাকা নিট ক্যাশ) = নগদ প্রাপ্তি − নগদ প্রদান − ক্যাশ জমাদান
  // বাকির অপরিশোধিত অংশ এখানে ধরা হয় না; পরে পরিশোধ হলে paidAmount-এ যুক্ত হয়ে হিসাবে আসে।
  const netCashBalance =
    totalSalesCash -
    (totalPurchasesCash + totalGeneralExpenses + totalSalaries + totalWorkerPayments) -
    totalCashDeposited;

  // স্যালারি এবং কর্মী মজুরি প্রদান একত্র করে খরচের তালিকা তৈরি
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
    <div className="space-y-6">
      {/* হেডার ও প্রিন্ট অ্যাকশন */}
      <PageHeader
        title={isEn ? "Accounting & Reports" : "একাউন্টিং ও রিপোর্ট"}
        subtitle={isEn ? "Unified financial statements, cash fund, bank deposit log, and report printing" : "ফ্যাক্টরির সমন্বিত আয়-ব্যয়, ক্যাশ ব্যালেন্স, ক্যাশ জমাদান হিস্ট্রি ও অফিশিয়াল রিপোর্ট প্রিন্ট"}
        action={
          <Link
            href={`/reports/print?start=${startStr}&end=${endStr}`}
            target="_blank"
            className="btn bg-brand-600 text-white hover:bg-brand-700 font-semibold"
          >
            <Printer size={16} /> {t(lang, "reports.print")}
          </Link>
        }
      />

      {/* তারিখ ফিল্টার ফর্ম */}
      <form method="GET" className="card border border-slate-100 bg-white p-4 shadow-sm grid gap-3 sm:grid-cols-3 no-print print:hidden">
        <div>
          <label className="label">{t(lang, "reports.startDate")}</label>
          <input type="date" name="start" defaultValue={startStr} className="input" />
        </div>
        <div>
          <label className="label">{t(lang, "reports.endDate")}</label>
          <input type="date" name="end" defaultValue={endStr} className="input" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full">
            {t(lang, "reports.filter")}
          </button>
        </div>
      </form>

      {/* ফিনান্সিয়াল সামারি কার্ডসমূহ (৬টি কার্ড) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border border-emerald-100 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-800">{t(lang, "acc.totalSale")}</p>
          <p className="text-lg font-bold text-emerald-700 mt-1">{formatTaka(totalSales, lang)}</p>
          <span className="text-[10px] text-emerald-600 font-mono">({isEn ? "Total Income" : "মোট ইনকাম"})</span>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50/70 to-gray-50/30 border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-gray-700">{t(lang, "acc.totalPurchase")}</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatTaka(totalPurchases, lang)}</p>
          <span className="text-[10px] text-gray-500 font-mono">({isEn ? "Total Purchase" : "মোট ক্রয়"})</span>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/70 to-yellow-50/30 border border-amber-100 shadow-2xs">
          <p className="text-xs font-semibold text-amber-800">{isEn ? "General Expenses" : "সাধারণ খরচ ও ইউটিলিটি"}</p>
          <p className="text-lg font-bold text-amber-900 mt-1">{formatTaka(totalGeneralExpenses, lang)}</p>
          <span className="text-[10px] text-amber-700 font-mono">({isEn ? "Other Bills" : "অন্যান্য বিল"})</span>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50/70 to-indigo-50/30 border border-blue-100 shadow-2xs">
          <p className="text-xs font-semibold text-blue-800">{isEn ? "Salaries & Worker Payments" : "বেতন ও কর্মী মজুরি"}</p>
          <p className="text-lg font-bold text-blue-700 mt-1">{formatTaka(totalSalaries + totalWorkerPayments, lang)}</p>
          <span className="text-[10px] text-blue-600 font-mono">({isEn ? "Workers & Staff" : "কর্মী ও স্টাফ"})</span>
        </Card>

        {/* ক্যাশ (নিট ক্যাশ তহবিল) কার্ড */}
        <Card className={`bg-gradient-to-br ${netCashBalance >= 0 ? "from-brand-50/80 to-teal-50/40 border-brand-200" : "from-red-50/80 to-orange-50/40 border-red-200"} shadow-2xs`}>
          <p className="text-xs font-semibold text-brand-900">{isEn ? "Net Fund (Cash+Bank)" : "নিট তহবিল (নগদ+ব্যাংক)"}</p>
          <p className={`text-lg font-bold mt-1 ${netCashBalance >= 0 ? "text-brand-700" : "text-red-600"}`}>
            {formatTaka(netCashBalance, lang)}
          </p>
          <span className="text-[10px] text-brand-600 font-mono">({isEn ? "After all payouts" : "সব খরচ বাদে"})</span>
        </Card>

        {/* ক্যাশ জমাদান (ব্যাংকে/তহবিলে) কার্ড */}
        <Card className="bg-gradient-to-br from-purple-50/80 to-indigo-50/40 border border-purple-200 shadow-2xs">
          <p className="text-xs font-semibold text-purple-900">{isEn ? "Cash Deposited" : "ক্যাশ জমাদান (ব্যাংক/তহবিলে)"}</p>
          <p className="text-lg font-bold text-purple-700 mt-1">{formatTaka(totalCashDeposited, lang)}</p>
          <span className="text-[10px] text-purple-600 font-mono">({isEn ? "Bank/Fund Deposit" : "ব্যাংকে জমা/ফান্ড"})</span>
        </Card>
      </div>

      {/* সেকশন ১: কারখানা ব্যয় ও ক্যাশ জমাদান এন্ট্রি */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
        <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
          <Wallet size={18} className="text-brand-600" />
          ১. {isEn ? "Expense & Cash Deposit Entry" : "কারখানা ব্যয় এন্ট্রি ও ক্যাশ জমাদান (ব্যাংক/তহবিলে)"}
        </h2>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold text-xs text-gray-700">{t(lang, "acc.newExpense")}</h3>
              <ExpenseForm />
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-xs text-gray-700">{isEn ? "New Cash Deposit Entry" : "নতুন ক্যাশ জমাদান (ব্যাংকে/মালিককে)"}</h3>
              <CashDepositForm />
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="mb-2 font-semibold text-xs text-gray-700">{t(lang, "acc.recentExp")}</h3>
            <DataTable
              data={recentExpenses}
              empty="—"
              columns={[
                { key: "date", header: t(lang, "pur.date"), render: (e) => formatDate(e.date, lang) },
                {
                  key: "category",
                  header: t(lang, "acc.category"),
                  render: (e) =>
                    e.category === "ক্যাশ জমা" ? (
                      <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                        ক্যাশ জমা
                      </span>
                    ) : (
                      lbl("expenseCategory", e.category, lang as Locale)
                    ),
                },
                { key: "amount", header: t(lang, "acc.amount"), render: (e) => formatTaka(e.amount, lang) },
                { key: "method", header: t(lang, "acc.method"), render: (e) => lbl("paymentMethod", e.paymentMethod, lang as Locale) },
                { key: "description", header: isEn ? "Description" : "বিবরণ", render: (e) => e.description || "—" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* সেকশন ২: ফাইনান্সিয়াল বিবরণী ও রিপোর্ট */}
      <div className="space-y-6 pt-2">
        <h2 className="font-bold text-gray-900 text-base flex items-center gap-2 border-b pb-2">
          <FileText size={20} className="text-indigo-600" />
          ২. {isEn ? "Detailed Financial Statements" : "ফাইনান্সিয়াল বিবরণী ও ডেট-রেঞ্জ রিপোর্ট"}
        </h2>

        {/* ১. বিক্রয় বিবরণী */}
        <div>
          <h3 className="mb-2 text-sm font-bold text-gray-800">
            ১. {isEn ? "Sales Statement" : "বিক্রয় বিবরণী"}
          </h3>
          <DataTable
            data={sales}
            empty={t(lang, "sale.empty")}
            columns={[
              { key: "date", header: t(lang, "sale.date"), render: (s) => formatDate(s.date, lang) },
              { key: "receiptNo", header: t(lang, "sale.receiptNo"), render: (s) => <span className="font-mono text-xs font-semibold">{s.receiptNo}</span> },
              { key: "customer", header: t(lang, "sale.customer"), render: (s) => s.customer?.name ?? "—" },
              { key: "totalAmount", header: t(lang, "sale.total"), render: (s) => formatTaka(s.totalAmount, lang) },
              { key: "paidAmount", header: t(lang, "sale.paid"), render: (s) => formatTaka(s.paidAmount, lang) },
              { key: "dueAmount", header: t(lang, "sale.due"), render: (s) => (Number(s.dueAmount) > 0 ? <span className="text-red-600 font-semibold">{formatTaka(s.dueAmount, lang)}</span> : "—") },
            ]}
          />
        </div>

        {/* ২. ক্রয় বিবরণী */}
        <div>
          <h3 className="mb-2 text-sm font-bold text-gray-800">
            ২. {isEn ? "Purchase Statement" : "ক্রয় বিবরণী"}
          </h3>
          <DataTable
            data={purchases}
            empty={t(lang, "pur.empty")}
            columns={[
              { key: "date", header: t(lang, "pur.date"), render: (p) => formatDate(p.date, lang) },
              { key: "receiptNo", header: t(lang, "pur.receiptNo"), render: (p) => <span className="font-mono text-xs font-semibold">{p.receiptNo}</span> },
              { key: "supplier", header: t(lang, "pur.supplier"), render: (p) => p.supplier?.name ?? "—" },
              { key: "totalAmount", header: t(lang, "pur.total"), render: (p) => formatTaka(p.totalAmount, lang) },
              { key: "paidAmount", header: t(lang, "pur.paid"), render: (p) => formatTaka(p.paidAmount, lang) },
              { key: "dueAmount", header: t(lang, "pur.due"), render: (p) => (Number(p.dueAmount) > 0 ? <span className="text-red-600 font-semibold">{formatTaka(p.dueAmount, lang)}</span> : "—") },
            ]}
          />
        </div>

        {/* ৩. সাধারণ খরচ বিবরণী */}
        <div>
          <h3 className="mb-2 text-sm font-bold text-gray-800">
            ৩. {isEn ? "General Expense Statement" : "সাধারণ খরচ বিবরণী (ক্যাশ জমা ব্যতীত)"}
          </h3>
          <DataTable
            data={generalExpenses}
            empty={isEn ? "No expenses found" : "কোনো খরচের হিসাব নেই"}
            columns={[
              { key: "date", header: t(lang, "pur.date"), render: (e) => formatDate(e.date, lang) },
              { key: "category", header: t(lang, "acc.category"), render: (e) => lbl("expenseCategory", e.category, lang as Locale) },
              { key: "amount", header: t(lang, "acc.amount"), render: (e) => formatTaka(e.amount, lang) },
              { key: "paymentMethod", header: t(lang, "acc.method"), render: (e) => lbl("paymentMethod", e.paymentMethod, lang as Locale) },
              { key: "description", header: isEn ? "Description" : "বিবরণ", render: (e) => e.description || "—" },
            ]}
          />
        </div>

        {/* ৪. ক্যাশ জমাদান বিবরণী (তারিখ ও বিবরণ সহ) */}
        <div>
          <h3 className="mb-2 text-sm font-bold text-purple-900 flex items-center gap-1.5">
            <ArrowUpRight size={16} className="text-purple-600" />
            ৪. {isEn ? "Cash Deposit Log (Bank / Fund Transfer)" : "ক্যাশ জমাদান বিবরণী (তারিখ, ব্যাংক ও বিবরণসহ)"}
          </h3>
          <DataTable
            data={cashDepositExpenses}
            empty={isEn ? "No cash deposits recorded" : "কোনো ক্যাশ জমাদানের রেকর্ড নেই"}
            columns={[
              { key: "date", header: t(lang, "pur.date"), render: (c) => formatDate(c.date, lang) },
              { key: "description", header: isEn ? "Bank / Note / Reference" : "ব্যাংকের নাম / স্লিপ / বিবরণ", render: (c) => <span className="font-semibold text-gray-900">{c.description || "ক্যাশ জমা"}</span> },
              { key: "paymentMethod", header: isEn ? "Medium" : "জমাদানের মাধ্যম", render: (c) => <span className="badge bg-purple-50 text-purple-700 border border-purple-100">{c.paymentMethod === "BANK" ? "ব্যাংক ডিপোজিট" : c.paymentMethod === "MOBILE" ? "মোবাইল ব্যাংকিং" : "নগদ হস্তান্তর"}</span> },
              { key: "amount", header: isEn ? "Deposited Amount" : "জমাকৃত টাকার পরিমাণ", render: (c) => <span className="font-bold text-purple-700">{formatTaka(c.amount, lang)}</span> },
            ]}
          />
        </div>

        {/* ৫. বেতন ও কর্মী বিল */}
        <div>
          <h3 className="mb-2 text-sm font-bold text-gray-800">
            ৫. {isEn ? "Salaries & Worker Payments" : "বেতন ও কর্মী মজুরি (প্রদানকৃত)"}
          </h3>
          <DataTable
            data={otherCosts}
            empty={isEn ? "No entries found" : "কোনো এন্ট্রি পাওয়া যায়নি"}
            columns={[
              { key: "date", header: t(lang, "pur.date"), render: (c) => formatDate(c.date, lang) },
              { key: "category", header: isEn ? "Cost Type" : "খরচের ধরন", render: (c) => <span className={c.category === "কর্মী মজুরি প্রদান" || c.category === "Worker Payment" ? "text-amber-700 font-semibold" : "text-indigo-700 font-semibold"}>{c.category}</span> },
              { key: "name", header: isEn ? "Recipient" : "গ্রহীতা", render: (c) => c.name },
              { key: "amount", header: t(lang, "acc.amount"), render: (c) => formatTaka(c.amount, lang) },
              { key: "description", header: isEn ? "Description" : "বিবরণ", render: (c) => c.description },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
