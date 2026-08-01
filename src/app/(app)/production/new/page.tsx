import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ProductionForm } from "../ProductionForm";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { ArrowLeft } from "lucide-react";

export default async function NewBatchPage() {
  const lang = await getLang();
  const [paddyItems, outputItems] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { type: "PADDY" }, orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({ where: { type: { in: ["RICE", "BYPRODUCT"] } }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div>
      <Link href="/production" className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={16} /> {t(lang, "prod.back")}
      </Link>
      <PageHeader title={t(lang, "prod.form.title")} subtitle={t(lang, "prod.form.subtitle")} />
      {paddyItems.length === 0 ? (
        <p className="text-sm text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-200 font-semibold">
          {lang === "en" ? "Please add Paddy items to Inventory first." : "উৎপাদন শুরু করতে ইনভেন্টরিতে প্রথমে ধান আইটেম যুক্ত করুন।"}
        </p>
      ) : (
        <ProductionForm
          paddyItems={paddyItems}
          outputItems={outputItems}
        />
      )}
    </div>
  );
}
