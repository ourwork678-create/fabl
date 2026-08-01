"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { createMachine } from "../actions";

export default function NewMachinePage() {
  const { t, lang } = useLang();
  const isEn = lang === "en";

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/machines" className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={16} /> {t("common.back")}
      </Link>
      <PageHeader title={isEn ? "New Equipment / Material" : "নতুন সরঞ্জাম"} />

      <form action={createMachine} className="card space-y-5 p-6">
        {/* নাম */}
        <div>
          <label className="label">{t("mach.form.name")} *</label>
          <input name="name" required className="input" placeholder={isEn ? "Enter name" : "নাম লিখুন"} />
        </div>

        {/* ধরন ও পরিমাণ */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t("mach.type")}</label>
            <input
              name="type"
              className="input"
              placeholder={isEn ? "Enter type (e.g. Tools, Sacks)" : "ধরন লিখুন (যেমন: টুলস, বস্তা)"}
            />
          </div>

          <div>
            <label className="label">{isEn ? "Quantity *" : "পরিমাণ *"}</label>
            <input
              name="quantity"
              type="number"
              required
              min="0"
              className="input"
              placeholder="0"
            />
          </div>
        </div>

        {/* সেভ বাটন */}
        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary">
            {isEn ? "Save" : "সেভ"}
          </button>
        </div>
      </form>
    </div>
  );
}
