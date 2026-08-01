"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { createWorkforceMember } from "../actions";

export default function NewWorkforceMemberPage() {
  const { t, lang } = useLang();
  const isEn = lang === "en";

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/workforce" className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={16} /> {t("common.back")}
      </Link>
      <PageHeader title={isEn ? "Add Workforce Member" : "নতুন কর্মী যোগ"} />

      <form action={createWorkforceMember} className="card space-y-5 p-6">
        {/* নাম */}
        <div>
          <label className="label">{isEn ? "Name *" : "নাম *"}</label>
          <input
            name="name"
            required
            className="input"
            placeholder={isEn ? "Enter full name" : "পুরো নাম লিখুন"}
          />
        </div>

        {/* মোবাইল ও পদবী */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{isEn ? "Phone" : "মোবাইল নম্বর"}</label>
            <input
              name="phone"
              className="input font-mono"
              placeholder={isEn ? "e.g. 017..." : "যেমন: 017..."}
            />
          </div>

          <div>
            <label className="label">{isEn ? "Designation" : "পদবী (কাজের ধরন)"}</label>
            <input
              name="designation"
              className="input"
              placeholder={isEn ? "e.g. Dryer Operator" : "যেমন: ড্রায়ার চালক, বস্তা লোডার"}
            />
          </div>
        </div>

        {/* হাজিরার ধরন ও মজুরি হার */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{isEn ? "Wage Type" : "মজুরি/হাজিরার ধরন"}</label>
            <select name="rateType" className="input" defaultValue="DAILY">
              <option value="DAILY">{isEn ? "Daily" : "দৈনিক"}</option>
              <option value="MONTHLY">{isEn ? "Monthly" : "মাসিক"}</option>
              <option value="PIECE">{isEn ? "Piece-rate" : "বস্তা প্রতি"}</option>
            </select>
          </div>

          <div>
            <label className="label">{isEn ? "Rate Amount (TK)" : "মজুরি হার (টাকা)"}</label>
            <input
              name="rateAmount"
              type="number"
              min="0"
              defaultValue="0"
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
