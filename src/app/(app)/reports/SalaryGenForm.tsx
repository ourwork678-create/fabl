"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export function SalaryGenForm() {
  const { t } = useLang();
  const [pending, start] = useTransition();
  const [month, setMonth] = useState(currentMonth());

  function generate() {
    start(async () => {
      try {
        const { generateSalaries } = await import("./actions");
        const fd = new FormData();
        fd.set("month", month);
        const count = await generateSalaries(fd);
        alert(`${count} ${t("acc.salaryCreated")}`);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  return (
    <div className="card flex items-end gap-2 p-4 border border-slate-200">
      <div className="flex-1">
        <label className="label">{t("acc.month")}</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input font-semibold" />
      </div>
      <button onClick={generate} disabled={pending} className="btn-primary">
        {pending && <Loader2 size={14} className="animate-spin" />}
        {t("acc.genSalary")}
      </button>
    </div>
  );
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
