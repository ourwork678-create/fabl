"use client";

import { unwrap } from "@/lib/action-result";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { useLang } from "@/components/LangProvider";

export function ExpenseForm() {
  const { t, lbl } = useLang();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const { addExpense } = await import("./actions");
        unwrap(await addExpense(fd));
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary w-full justify-center gap-2">
        <Plus size={16} />
        {t("acc.addExpense")}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-4 border border-slate-200">
      <div className="grid grid-cols-2 gap-3">
        <select name="category" required className="input" defaultValue="">
          <option value="" disabled>{t("acc.category")}</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{lbl("expenseCategory", c)}</option>
          ))}
        </select>
        <input name="amount" type="number" step="0.01" required placeholder={t("acc.amount")} className="input font-semibold" />
      </div>
      <select name="method" className="input" defaultValue="CASH">
        {PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>{lbl("paymentMethod", m)}</option>
        ))}
      </select>
      <input name="description" className="input" placeholder={t("acc.desc")} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary flex-1">
          {pending && <Loader2 size={14} className="animate-spin" />}
          {t("common.save")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">{t("common.cancel")}</button>
      </div>
    </form>
  );
}
