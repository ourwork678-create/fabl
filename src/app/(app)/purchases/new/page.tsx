import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { PurchaseForm } from "../PurchaseForm";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { ArrowLeft } from "lucide-react";

export default async function NewPurchasePage() {
  const lang = await getLang();
  const [suppliers, paddyItems] = await Promise.all([
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({ where: { type: "PADDY" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <Link href="/purchases" className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={16} /> {t(lang, "pur.back")}
      </Link>
      <PageHeader title={t(lang, "pur.form.title")} subtitle={t(lang, "pur.form.subtitle")} />
      <PurchaseForm suppliers={suppliers} paddyItems={paddyItems} />
    </div>
  );
}
