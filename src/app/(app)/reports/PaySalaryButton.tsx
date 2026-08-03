"use client";

import { unwrap } from "@/lib/action-result";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export function PaySalaryButton({ id }: { id: string }) {
  const { t } = useLang();
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
    <button onClick={pay} disabled={pending} className="btn-primary py-1 text-xs">
      {pending && <Loader2 size={12} className="animate-spin" />}
      {t("acc.pay")}
    </button>
  );
}
