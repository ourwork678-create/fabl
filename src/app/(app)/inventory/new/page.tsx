import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ITEM_TYPES } from "@/lib/constants";
import { t, lbl, type Locale } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { ArrowRight } from "lucide-react";
import { createInventoryItem } from "../actions";

export default async function NewItemPage() {
  const lang = await getLang();
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={t(lang, "inv.form.title")} subtitle={t(lang, "inv.form.subtitle")} />

      <form action={createInventoryItem} className="card space-y-4 p-6">
        <div>
          <label className="label">{t(lang, "inv.form.name")} *</label>
          <input name="name" required className="input" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t(lang, "inv.form.type")} *</label>
            <select name="type" required className="input" defaultValue="PADDY">
              {ITEM_TYPES.map((it2) => (
                <option key={it2} value={it2}>
                  {lbl("itemType", it2, lang as Locale)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t(lang, "inv.form.unit")}</label>
            <input name="unit" className="input" defaultValue="মণ" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t(lang, "inv.form.startStock")}</label>
            <input name="currentStock" type="number" step="0.001" className="input" defaultValue={0} />
          </div>
          <div>
            <label className="label">{t(lang, "inv.form.minStock")}</label>
            <input name="minStock" type="number" step="0.001" className="input" defaultValue={0} />
          </div>
        </div>

        <div>
          <label className="label">{t(lang, "inv.form.price")}</label>
          <input name="saleRate" type="number" step="0.01" className="input" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/inventory" className="btn-secondary">
            {t(lang, "common.cancel")}
          </Link>
          <button type="submit" className="btn-primary">
            {t(lang, "common.save")} <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
