import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { formatTaka, formatDate, formatNumber } from "@/lib/utils";
import { lbl, type Locale } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { UtilityForm } from "./UtilityForm";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteUtilityExpense } from "./actions";
import { Zap, Calendar, DollarSign } from "lucide-react";

export default async function UtilitiesPage() {
  const lang = await getLang();
  const isEn = lang === "en";

  const utilityCategories = ["বিদ্যুৎ", "জ্বালানি", "পানি", "ইন্টারনেট", "অন্যান্য বিল", "ইউটিলিটি"];

  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [totalUtility, monthlyUtility, utilityExpenses] = await Promise.all([
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { category: { in: utilityCategories } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        category: { in: utilityCategories },
        date: { gte: firstDayOfMonth },
      },
    }),
    prisma.expense.findMany({
      where: { category: { in: utilityCategories } },
      orderBy: { date: "desc" },
    }),
  ]);

  const totalAmount = Number(totalUtility._sum.amount ?? 0);
  const monthlyAmount = Number(monthlyUtility._sum.amount ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEn ? "Electricity & Other Utility Bills" : "বিদ্যুৎ ও অন্যান্য বিল"}
        subtitle={isEn ? "Manage factory electricity, fuel, water, and utility expenses" : "ফ্যাক্টরির বিদ্যুৎ, জেনারেটর, জ্বালানি ও অন্যান্য বিলের হিসাব ও ডেটাবেস রেকর্ডিং"}
      />

      {/* সামারি কার্ডসমূহ (মোবাইলে ২ কলাম ও রেসপন্সিভ) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="card-gradient p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-gray-500 font-medium">{isEn ? "Total Utility Bills" : "সর্বমোট বিদ্যুৎ ও বিল খরচ"}</span>
            <span className="p-1 rounded-lg bg-amber-50 text-amber-600 shrink-0">
              <Zap size={15} />
            </span>
          </div>
          <p className="mt-1 text-base font-bold text-gray-900 sm:text-xl">
            {formatTaka(totalAmount, lang)}
          </p>
        </Card>

        <Card className="card-gradient p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-gray-500 font-medium">{isEn ? "This Month's Bills" : "চলতি মাসের বিল"}</span>
            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
              <Calendar size={15} />
            </span>
          </div>
          <p className="mt-1 text-base font-bold text-indigo-700 sm:text-xl">
            {formatTaka(monthlyAmount, lang)}
          </p>
        </Card>

        <Card className="card-gradient p-3.5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-gray-500 font-medium">{isEn ? "Total Bill Entries" : "মোট বিল এন্ট্রি"}</span>
            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
              <DollarSign size={15} />
            </span>
          </div>
          <p className="mt-1 text-base font-bold text-gray-900 sm:text-xl">
            {formatNumber(utilityExpenses.length, lang)} {isEn ? "entries" : "টি"}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* বিল যোগ করার ফর্ম */}
        <div className="lg:col-span-5">
          <UtilityForm />
        </div>

        {/* বিদ্যুৎ ও বিলের ডেটাবেস তালিকা */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm">
            {isEn ? "Recorded Utility Bills" : "সংরক্ষিত বিদ্যুৎ ও বিলের তালিকা"}
          </h2>

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
            <DataTable
              data={utilityExpenses}
              empty={isEn ? "No utility bills recorded yet" : "কোনো বিদ্যুৎ ও বিল রেকর্ড করা হয়নি"}
              columns={[
                {
                  key: "date",
                  header: isEn ? "Date" : "তারিখ",
                  render: (e) => (
                    <div>
                      <span className="font-semibold text-gray-900">{formatDate(e.date, lang)}</span>
                      {e.description && <div className="text-[10px] text-gray-400 sm:hidden">{e.description}</div>}
                    </div>
                  ),
                },
                {
                  key: "category",
                  header: isEn ? "Category" : "বিলের ধরণ",
                  render: (e) => (
                    <span className="font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded text-xs border border-amber-200/60 inline-block">
                      {lbl("expenseCategory", e.category, lang as Locale)}
                    </span>
                  ),
                },
                {
                  key: "amount",
                  header: isEn ? "Amount" : "পরিমাণ",
                  render: (e) => <span className="font-bold text-gray-900">{formatTaka(e.amount, lang)}</span>,
                },
                {
                  key: "paymentMethod",
                  header: isEn ? "Method" : "মাধ্যম",
                  className: "hidden sm:table-cell",
                  render: (e) => (
                    <span className="text-xs text-gray-600">
                      {e.paymentMethod === "CASH" ? (isEn ? "Cash" : "নগদ") : e.paymentMethod === "BANK" ? (isEn ? "Bank" : "ব্যাংক") : (isEn ? "Mobile" : "মোবাইল")}
                    </span>
                  ),
                },
                {
                  key: "description",
                  header: isEn ? "Description" : "বিবরণ",
                  className: "hidden sm:table-cell",
                  render: (e) => <span className="text-xs text-gray-500">{e.description || "—"}</span>,
                },
                {
                  key: "actions",
                  header: "",
                  render: (e) => (
                    <div className="flex justify-end">
                      <DeleteButton
                        action={deleteUtilityExpense.bind(null, e.id)}
                        label={isEn ? "Delete" : "মুছুন"}
                        confirmText={isEn ? "Delete this bill entry?" : "এই বিলটি মুছে ফেলতে চান?"}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
