import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { formatTaka, formatDate } from "@/lib/utils";
import { t, lbl, type Locale } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { Plus, Printer } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { deletePurchase } from "./actions";

export default async function PurchasesPage() {
  const lang = await getLang();
  const purchases = await prisma.purchase.findMany({
    include: { supplier: true },
    orderBy: { date: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title={t(lang, "pur.title")}
        subtitle={t(lang, "pur.subtitle")}
        action={
          <Link href="/purchases/new" className="btn-primary">
            <Plus size={16} /> {t(lang, "pur.new")}
          </Link>
        }
      />

      <DataTable
        data={purchases}
        empty={t(lang, "pur.empty")}
        columns={[
          { key: "receiptNo", header: t(lang, "pur.receiptNo"), render: (p) => <span className="font-mono text-xs">{p.receiptNo}</span> },
          { key: "date", header: t(lang, "pur.date"), render: (p) => formatDate(p.date, lang) },
          { key: "supplier", header: t(lang, "pur.supplier"), render: (p) => p.supplier?.name ?? "—" },
          { key: "totalAmount", header: t(lang, "pur.total"), render: (p) => <span className="font-medium">{formatTaka(p.totalAmount, lang)}</span> },
          { key: "paidAmount", header: t(lang, "pur.paid"), render: (p) => formatTaka(p.paidAmount, lang) },
          { key: "dueAmount", header: t(lang, "pur.due"), render: (p) => (Number(p.dueAmount) > 0 ? <span className="text-red-600">{formatTaka(p.dueAmount, lang)}</span> : "—") },
          {
            key: "status",
            header: t(lang, "pur.status"),
            render: (p) => {
              const v: Record<string, string> = {
                PENDING: "bg-amber-100 text-amber-700",
                PARTIAL: "bg-blue-100 text-blue-700",
                PAID: "bg-brand-100 text-brand-700",
                CANCELLED: "bg-gray-100 text-gray-600",
              };
              return <span className={`badge ${v[p.status]}`}>{lbl("txnStatus", p.status, lang as Locale)}</span>;
            },
          },
          {
            key: "actions",
            header: "",
            render: (p) => (
              <div className="flex items-center gap-2">
                <Link
                  href={`/purchases/${p.id}/print`}
                  target="_blank"
                  className="btn-ghost p-1.5 text-gray-500 hover:text-brand-600 rounded-lg"
                  title={t(lang, "print.invoice")}
                >
                  <Printer size={16} />
                </Link>
                <DeleteButton
                  action={deletePurchase.bind(null, p.id)}
                  label={t(lang, "common.delete")}
                  confirmText={t(lang, "pur.deleteConfirm")}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
