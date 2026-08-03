"use client";

import { unwrap } from "@/lib/action-result";

import { useTransition } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export function PaySalaryButton({ id }: { id: string }) {
  const { lang } = useLang();
  const isEn = lang === "en";
  const [pending, start] = useTransition();

  function pay() {
    start(async () => {
      try {
        const { paySalary } = await import("./actions");
        unwrap(await paySalary(id));
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  return (
    <button onClick={pay} disabled={pending} className="btn bg-brand-600 text-white hover:bg-brand-700 py-1 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1">
      {pending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
      {isEn ? "Pay Salary" : "বেতন পরিশোধ"}
    </button>
  );
}
