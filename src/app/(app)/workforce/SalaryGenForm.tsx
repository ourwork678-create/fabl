"use client";

import { useState, useTransition } from "react";
import { Loader2, Calendar } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export function SalaryGenForm() {
  const { t, lang } = useLang();
  const isEn = lang === "en";
  const [pending, start] = useTransition();
  const [month, setMonth] = useState(currentMonth());

  function generate() {
    start(async () => {
      try {
        const { generateSalaries } = await import("./actions");
        const fd = new FormData();
        fd.set("month", month);
        const count = await generateSalaries(fd);
        alert(isEn ? `${count} staff salary sheets generated!` : `${count} জন কর্মকর্তা/কর্মচারীর বেতনের শিট জেনারেট হয়েছে!`);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex items-end gap-3">
      <div className="flex-1">
        <label className="label text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-1.5">
          <Calendar size={14} className="text-indigo-600" />
          {isEn ? "Select Month for Staff Salaries" : "মাসিক বেতন জেনারেট (মালিক ব্যতীত কর্মকর্তা/কর্মচারী)"}
        </label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input font-semibold" />
      </div>
      <button onClick={generate} disabled={pending} className="btn-primary py-2.5 px-4 font-semibold text-xs shrink-0">
        {pending && <Loader2 size={14} className="animate-spin" />}
        {isEn ? "Generate Staff Salary" : "মাসিক বেতন শিট তৈরি করুন"}
      </button>
    </div>
  );
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
