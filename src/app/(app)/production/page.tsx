import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { formatNumber, formatDate } from "@/lib/utils";
import { t, lbl, type Locale } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { Plus } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteBatch } from "./actions";

export default async function ProductionPage() {
  const lang = await getLang();
  const batches = await prisma.productionBatch.findMany({
    include: {
      machine: true,
      operator: true,
      inputs: { include: { item: true } },
      outputs: { include: { item: true } },
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  return (
    <div>
      <PageHeader
        title={t(lang, "prod.title")}
        subtitle={t(lang, "prod.subtitle")}
        action={
          <Link href="/production/new" className="btn-primary">
            <Plus size={16} /> {t(lang, "prod.new")}
          </Link>
        }
      />

      <DataTable
        data={batches}
        empty={t(lang, "prod.empty")}
        columns={[
          { key: "batchNo", header: t(lang, "prod.batchNo"), render: (b) => <span className="font-mono text-xs font-semibold">{b.batchNo}</span> },
          { key: "date", header: t(lang, "prod.date"), render: (b) => formatDate(b.date, lang) },
          {
            key: "inputs",
            header: t(lang, "prod.input"),
            render: (b) => b.inputs.map((i) => `${formatNumber(i.quantity, lang)} ${i.item.name}`).join(", ") || "—",
          },
          {
            key: "outputs",
            header: t(lang, "prod.output"),
            render: (b) => b.outputs.map((o) => `${formatNumber(o.quantity, lang)} ${o.item.name}`).join(", ") || "—",
          },
          {
            key: "recoveryRate",
            header: t(lang, "prod.rate"),
            render: (b) => (b.recoveryRate ? `${Number(b.recoveryRate).toFixed(1)}%` : "—"),
          },
          {
            key: "status",
            header: t(lang, "prod.status"),
            render: (b) => <span className="badge bg-brand-100 text-brand-700">{lbl("productionStatus", b.status, lang as Locale)}</span>,
          },
          {
            key: "actions",
            header: "",
            render: (b) => (
              <DeleteButton action={deleteBatch.bind(null, b.id)} label={t(lang, "common.delete")} confirmText={t(lang, "prod.deleteConfirm")} />
            ),
          },
        ]}
      />
    </div>
  );
}
