"use client";

import { unwrap } from "@/lib/action-result";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export function StockAdjustForm({
  item,
}: {
  item: { id: string; currentStock: any; unit: string };
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const { adjustStock } = await import("./actions");
        unwrap(await adjustStock(item.id, fd));
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost px-2 py-1 text-xs">
        {t("inv.adjust")}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <input type="hidden" name="direction" value="IN" id={`dir-${item.id}`} />
      <select
        className="rounded border border-gray-300 px-1 py-1 text-xs"
        onChange={(e) => {
          (document.getElementById(`dir-${item.id}`) as HTMLInputElement).value =
            e.target.value;
        }}
        defaultValue="IN"
      >
        <option value="IN">+</option>
        <option value="OUT">−</option>
      </select>
      <input
        name="quantity"
        type="number"
        step="0.001"
        required
        placeholder={t("pur.form.qty")}
        className="w-20 rounded border border-gray-300 px-2 py-1 text-xs"
      />
      <button type="submit" disabled={pending} className="btn-primary px-2 py-1 text-xs">
        {pending ? <Loader2 size={12} className="animate-spin" /> : t("common.save")}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1 text-xs">
        {t("common.cancel")}
      </button>
    </form>
  );
}
