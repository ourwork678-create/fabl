"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { createMachinery } from "../actions";

export default function NewMachineryPage() {
  const { t, lang } = useLang();
  const isEn = lang === "en";

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/machines" className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={16} /> {t("common.back")}
      </Link>
      <PageHeader title={isEn ? "New Machinery" : "নতুন মেশিনারি"} />

      <form action={createMachinery} className="card space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t("mach.form.name")} *</label>
            <input name="name" required className="input" placeholder={isEn ? "Enter name" : "নাম লিখুন"} />
          </div>
          <div>
            <label className="label">{isEn ? "Brand *" : "ব্র্যান্ড *"}</label>
            <input name="brand" required className="input" placeholder={isEn ? "e.g. BOI-01" : "যেমন: BOI-01"} />
          </div>
        </div>

        {/* সংরক্ষণ বাটন */}
        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary">
            {isEn ? "Save" : "সেভ"}
          </button>
        </div>
      </form>
    </div>
  );
}
