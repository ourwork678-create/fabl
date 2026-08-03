"use client";

import { unwrap } from "@/lib/action-result";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/constants";
import { useLang } from "@/components/LangProvider";

export function PaymentForm({
  partyType,
  partyId,
}: {
  partyType: "CUSTOMER" | "SUPPLIER";
  partyId: string;
}) {
  const { t, lbl } = useLang();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const direction = partyType === "CUSTOMER" ? "RECEIVED" : "PAID";
  const label = partyType === "CUSTOMER" ? t("cust.receive") : t("sup.pay");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const { recordPayment } = await import("./actions");
        unwrap(await recordPayment({
          partyType,
          partyId,
          direction,
          amount: Number(fd.get("amount")),
          method: (fd.get("method") as string) || "CASH",
          note: (fd.get("note") as string) || undefined,
        }));
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary px-2 py-1 text-xs">
        {label}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-1">
      <input name="amount" type="number" step="0.01" required placeholder={t("acc.amount")} className="w-24 rounded border border-gray-300 px-2 py-1 text-xs" />
      <select name="method" className="rounded border border-gray-300 px-1 py-1 text-xs">
        {PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>{lbl("paymentMethod", m)}</option>
        ))}
      </select>
      <input name="note" placeholder={t("pur.form.note")} className="w-20 rounded border border-gray-300 px-2 py-1 text-xs" />
      <button type="submit" disabled={pending} className="btn-primary px-2 py-1 text-xs">
        {pending ? <Loader2 size={12} className="animate-spin" /> : t("common.save")}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1 text-xs">
        {t("common.cancel")}
      </button>
    </form>
  );
}
