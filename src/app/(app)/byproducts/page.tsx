import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { formatTaka, formatDate, formatNumber } from "@/lib/utils";
import { getLang } from "@/lib/i18n-server";
import { ByproductForm } from "./ByproductForm";
import { Printer, Boxes, TrendingUp, DollarSign } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteSale } from "@/app/(app)/sales/actions";

export default async function ByproductsPage() {
  const lang = await getLang();
  const isEn = lang === "en";

  const [customers, byproducts, byproductSales, totalSalesAgg] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({
      where: { type: "BYPRODUCT" },
      orderBy: { name: "asc" },
    }),
    prisma.sale.findMany({
      where: {
        items: {
          some: {
            item: { type: "BYPRODUCT" },
          },
        },
      },
      include: {
        customer: true,
        items: { include: { item: true } },
      },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.saleItem.aggregate({
      _sum: { amount: true },
      where: { item: { type: "BYPRODUCT" } },
    }),
  ]);

  const totalByproductAmount = Number(totalSalesAgg._sum.amount ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEn ? "Byproduct Sales" : "উপজাত বিক্রয়"}
        subtitle={isEn ? "Record and print invoices for Rice Bran, Broken Rice, and Husk sales" : "কুঁড়া/গুঁড়া, খুদ এবং তুষ সহজ বিক্রয় এন্ট্রি, ইনভয়েস প্রিন্টিং ও আয় কাউন্টিং"}
      />

      {/* সামারি কার্ডসমূহ (মোবাইলে ২ কলামে ক্লিন কার্ডস) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="card-gradient p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-gray-500 font-medium">{isEn ? "Total Byproduct Income" : "মোট উপজাত বিক্রয় (আয়)"}</span>
            <span className="p-1 rounded-lg bg-teal-50 text-teal-600 shrink-0">
              <TrendingUp size={15} />
            </span>
          </div>
          <p className="mt-1 text-base font-bold text-teal-700 sm:text-xl">
            {formatTaka(totalByproductAmount, lang)}
          </p>
        </Card>

        <Card className="card-gradient p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-gray-500 font-medium">{isEn ? "Byproduct Items" : "উপজাতের প্রকার"}</span>
            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
              <Boxes size={15} />
            </span>
          </div>
          <p className="mt-1 text-base font-bold text-gray-900 sm:text-xl">
            {formatNumber(byproducts.length, lang)} {isEn ? "items" : "টি"}
          </p>
        </Card>

        <Card className="card-gradient p-3.5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-gray-500 font-medium">{isEn ? "Total Invoices" : "মোট উপজাত ইনভয়েস"}</span>
            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
              <DollarSign size={15} />
            </span>
          </div>
          <p className="mt-1 text-base font-bold text-indigo-700 sm:text-xl">
            {formatNumber(byproductSales.length, lang)} {isEn ? "invoices" : "টি"}
          </p>
        </Card>
      </div>

      {/* ২ টি প্রধান সেকশন (১: এন্ট্রি ফর্ম, ২: মেমো ইনভয়েস ইতিহাস) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* ফর্ম সেকশন */}
        <div className="lg:col-span-5">
          <ByproductForm customers={customers} />
        </div>

        {/* ইতিহাস ও মেমো সেকশন */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm">
            {isEn ? "Byproduct Sales History & Invoices" : "উপজাত বিক্রয়ের ইতিহাস ও ইনভয়েস মেমো"}
          </h2>

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
            <DataTable
              data={byproductSales}
              empty={isEn ? "No byproduct sales recorded yet" : "কোনো উপজাত বিক্রয় রেকর্ড করা হয়নি"}
              columns={[
                {
                  key: "receiptNo",
                  header: isEn ? "Receipt No" : "মেমো নম্বর",
                  render: (p) => (
                    <div>
                      <span className="font-mono text-xs font-semibold text-gray-900">{p.receiptNo}</span>
                      <div className="text-[10px] text-gray-400 sm:hidden">{formatDate(p.date, lang)}</div>
                    </div>
                  ),
                },
                {
                  key: "date",
                  header: isEn ? "Date" : "তারিখ",
                  className: "hidden sm:table-cell",
                  render: (p) => formatDate(p.date, lang),
                },
                {
                  key: "customer",
                  header: isEn ? "Buyer" : "ক্রেতা",
                  render: (p) => (p.customer?.name === "নগদ উপজাত ক্রেতা" || !p.customer?.name) ? (isEn ? "Cash Buyer" : "নগদ ক্রেতা") : p.customer.name,
                },
                {
                  key: "items",
                  header: isEn ? "Item & Qty" : "উপজাত ও পরিমাণ",
                  render: (p) => {
                    const firstItem = p.items[0];
                    if (!firstItem) return "—";
                    const unitStr = firstItem.item?.unit === "বস্তা" ? (isEn ? "Bags" : "বস্তা") : firstItem.item?.unit === "কেজি" ? (isEn ? "Kg" : "কেজি") : firstItem.item?.unit === "মণ" ? (isEn ? "Maund" : "মণ") : (firstItem.item?.unit || (isEn ? "Bags" : "বস্তা"));
                    return (
                      <span className="text-xs font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                        {firstItem.item?.name}: {Number(firstItem.quantity)} {unitStr}
                      </span>
                    );
                  },
                },
                {
                  key: "totalAmount",
                  header: isEn ? "Total" : "মোট টাকা",
                  render: (p) => <span className="font-bold text-teal-800">{formatTaka(p.totalAmount, lang)}</span>,
                },
                {
                  key: "dueAmount",
                  header: isEn ? "Due" : "বকেয়া",
                  render: (p) =>
                    Number(p.dueAmount) > 0 ? (
                      <span className="text-red-600 font-semibold">{formatTaka(p.dueAmount, lang)}</span>
                    ) : (
                      <span className="text-emerald-600 text-xs font-medium">{isEn ? "Paid" : "পরিশোধিত"}</span>
                    ),
                },
                {
                  key: "actions",
                  header: isEn ? "Memo" : "মেমো",
                  render: (p) => (
                    <div className="flex items-center gap-1.5 justify-end">
                      <Link
                        href={`/sales/${p.id}/print`}
                        target="_blank"
                        className="btn bg-teal-50 text-teal-700 hover:bg-teal-100 p-1.5 text-xs rounded-lg flex items-center gap-1 font-semibold border border-teal-200"
                        title="প্রিন্ট মেমো"
                      >
                        <Printer size={13} />
                        <span className="hidden sm:inline">{isEn ? "Print" : "মেমো"}</span>
                      </Link>
                      <DeleteButton
                        action={deleteSale.bind(null, p.id)}
                        confirmText={isEn ? "Delete this byproduct sale?" : "এই উপজাত বিক্রয়টি মুছে ফেলতে চান?"}
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
