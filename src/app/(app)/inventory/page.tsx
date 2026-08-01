import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { formatNumber } from "@/lib/utils";
import { t, lbl, type Locale } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { Package, Plus, Wheat, Layers, TrendingUp } from "lucide-react";
import { StockAdjustForm } from "./StockAdjustForm";

export default async function InventoryPage() {
  const lang = await getLang();
  const isEn = lang === "en";

  const items = await prisma.inventoryItem.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const totalValue = items.reduce(
    (sum, i) => sum + Number(i.currentStock) * Number(i.saleRate ?? 0),
    0
  );

  const paddyItems = items.filter((i) => i.type === "PADDY");
  const totalPaddyStock = paddyItems.reduce((sum, i) => sum + Number(i.currentStock), 0);

  const riceItems = items.filter((i) => i.type === "RICE");
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

  const byproductItems = items.filter((i) => i.type === "BYPRODUCT");

  return (
    <div>
      <PageHeader
        title={t(lang, "inv.title")}
        subtitle={t(lang, "inv.subtitle")}
        action={
          <Link href="/inventory/new" className="btn-primary">
            <Plus size={16} /> {t(lang, "inv.new")}
          </Link>
        }
      />

      {/* ড্যাশবোর্ড স্টাইলের হাল্কা গ্রাডিয়েন্ট সামারি কার্ডসমূহ */}
      <div className="mb-6 space-y-3">
        {/* ১ম সারি: মোট ধান, মোট চাল ও মোট আনুমানিক স্টক মূল্য */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* সর্বমোট ধানের মজুদ */}
          <Card className="bg-gradient-to-br from-amber-50/80 to-yellow-50/40 border border-amber-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900">{isEn ? "Total Paddy Stock" : "সর্বমোট ধানের মজুদ"}</span>
              <span className="p-1.5 rounded-xl bg-amber-100 text-amber-700">
                <Wheat size={18} />
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-amber-900">
              {formatNumber(totalPaddyStock, lang)} {isEn ? "Maund" : "মণ"}
            </p>
          </Card>

          {/* সর্বমোট চালের মজুদ */}
          <Card className="bg-gradient-to-br from-sky-50/80 to-blue-50/40 border border-sky-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-900">{isEn ? "Total Rice Stock" : "সর্বমোট চালের মজুদ"}</span>
              <span className="p-1.5 rounded-xl bg-sky-100 text-sky-700">
                <Package size={18} />
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-sky-900">
              {formatNumber(totalRiceStock, lang)} {isEn ? "Kg" : "কেজি"}
            </p>
          </Card>

          {/* মোট স্টক মূল্য */}
          <Card className="bg-gradient-to-br from-purple-50/80 to-indigo-50/40 border border-purple-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-900">{isEn ? "Estimated Stock Value" : "স্টক মূল্য (আনুমানিক)"}</span>
              <span className="p-1.5 rounded-xl bg-purple-100 text-purple-700">
                <TrendingUp size={18} />
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-purple-950">
              ৳ {new Intl.NumberFormat(isEn ? "en-US" : "bn-BD").format(Math.round(totalValue))}
            </p>
          </Card>
        </div>

        {/* ২য় সারি: চাল, ধান ও উপজাতের প্রতিটি আলাদা প্রকারের রিয়েল-টাইম সামারি কার্ড */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {/* বিভিন্ন প্রকার চালের আলাদা কার্ড */}
          {riceItems.map((item) => {
            const u = (item.unit || "").trim();
            const unitLabel = u === "বস্তা" ? (isEn ? "Bags" : "বস্তা") : u === "কেজি" ? (isEn ? "Kg" : "কেজি") : u === "মণ" ? (isEn ? "Maund" : "মণ") : u;
            return (
              <Card key={item.id} className="bg-gradient-to-br from-sky-50/70 to-blue-50/30 border border-sky-100 shadow-2xs p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-sky-900 font-bold truncate" title={item.name}>{item.name}</p>
                  <Package size={14} className="text-sky-600 shrink-0" />
                </div>
                <p className="mt-1 text-base font-bold text-sky-950">
                  {formatNumber(item.currentStock, lang)} {unitLabel}
                </p>
              </Card>
            );
          })}

          {/* বিভিন্ন প্রকার ধানের আলাদা কার্ড */}
          {paddyItems.map((item) => {
            const u = (item.unit || "").trim();
            const unitLabel = u === "বস্তা" ? (isEn ? "Bags" : "বস্তা") : u === "কেজি" ? (isEn ? "Kg" : "কেজি") : u === "মণ" ? (isEn ? "Maund" : "মণ") : u;
            return (
              <Card key={item.id} className="bg-gradient-to-br from-yellow-50/70 to-amber-50/30 border border-amber-100 shadow-2xs p-3">
                <p className="text-xs text-amber-800 font-semibold truncate" title={item.name}>{item.name}</p>
                <p className="mt-1 text-base font-bold text-amber-950">
                  {formatNumber(item.currentStock, lang)} {unitLabel}
                </p>
              </Card>
            );
          })}

          {/* বিভিন্ন প্রকার উপজাতের আলাদা কার্ড */}
          {byproductItems.map((item) => {
            const u = (item.unit || "").trim();
            const unitLabel = u === "বস্তা" ? (isEn ? "Bags" : "বস্তা") : u === "কেজি" ? (isEn ? "Kg" : "কেজি") : u === "মণ" ? (isEn ? "Maund" : "মণ") : u;
            return (
              <Card key={item.id} className="bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border border-emerald-100 shadow-2xs p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-emerald-800 font-semibold truncate" title={item.name}>{item.name}</p>
                  <Layers size={14} className="text-emerald-600 shrink-0" />
                </div>
                <p className="mt-1 text-base font-bold text-emerald-950">
                  {formatNumber(item.currentStock, lang)} {unitLabel}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      <DataTable
        empty={t(lang, "inv.empty")}
        data={items}
        columns={[
          {
            key: "name",
            header: t(lang, "inv.product"),
            render: (i) => <span className="font-medium text-gray-900">{i.name}</span>,
          },
          {
            key: "type",
            header: t(lang, "inv.type"),
            render: (i) => (
              <span className="badge bg-gray-100 text-gray-600">
                {lbl("itemType", i.type, lang as Locale)}
              </span>
            ),
          },
          {
            key: "currentStock",
            header: t(lang, "inv.currentStock"),
            render: (i) => {
              const low = Number(i.currentStock) <= Number(i.minStock);
              const u = (i.unit || "").trim();
              const unitLabel = u === "বস্তা" ? (isEn ? "Bags" : "বস্তা") : u === "কেজি" ? (isEn ? "Kg" : "কেজি") : u === "মণ" ? (isEn ? "Maund" : "মণ") : u;
              return (
                <span className={low ? "font-semibold text-amber-600" : ""}>
                  {formatNumber(i.currentStock, lang)} {unitLabel}
                </span>
              );
            },
          },
          {
            key: "minStock",
            header: t(lang, "inv.minStock"),
            render: (i) => {
              const u = (i.unit || "").trim();
              const unitLabel = u === "বস্তা" ? (isEn ? "Bags" : "বস্তা") : u === "কেজি" ? (isEn ? "Kg" : "কেজি") : u === "মণ" ? (isEn ? "Maund" : "মণ") : u;
              return `${formatNumber(i.minStock, lang)} ${unitLabel}`;
            },
          },
          {
            key: "saleRate",
            header: t(lang, "inv.saleRate"),
            render: (i) => {
              const u = (i.unit || "").trim();
              const unitLabel = u === "বস্তা" ? (isEn ? "Bags" : "বস্তা") : u === "কেজি" ? (isEn ? "Kg" : "কেজি") : u === "মণ" ? (isEn ? "Maund" : "মণ") : u;
              return i.saleRate ? `৳ ${formatNumber(i.saleRate, lang)}/${unitLabel}` : "—";
            },
          },
          {
            key: "actions",
            header: t(lang, "inv.adjust"),
            render: (i) => <StockAdjustForm item={i} />,
          },
        ]}
      />

      {items.length === 0 && (
        <div className="mt-6 text-center">
          <Package className="mx-auto mb-2 text-gray-300" size={40} />
          <Link href="/inventory/new" className="btn-secondary">
            {t(lang, "inv.first")}
          </Link>
        </div>
      )}
    </div>
  );
}
