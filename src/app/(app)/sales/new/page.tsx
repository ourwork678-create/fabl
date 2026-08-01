import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { SaleForm } from "../SaleForm";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { ArrowLeft } from "lucide-react";

export default async function NewSalePage() {
  const lang = await getLang();
  const [customers, riceItems] = await Promise.all([
    prisma.customer.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({ where: { type: "RICE" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <Link href="/sales" className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={16} /> {t(lang, "sale.back")}
      </Link>
      <PageHeader title={t(lang, "sale.form.title")} subtitle={t(lang, "sale.form.subtitle")} />
      <SaleForm customers={customers} riceItems={riceItems} />
    </div>
  );
}
