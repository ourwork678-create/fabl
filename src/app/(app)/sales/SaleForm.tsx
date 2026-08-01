"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";

type Item = { id: string; name: string; unit: string; currentStock: any; saleRate: any };
type Customer = { id: string; name: string };

export function SaleForm({
  customers,
  riceItems,
}: {
  customers: Customer[];
  riceItems: Item[];
}) {
  const router = useRouter();
  const { t } = useLang();
  const [pending, start] = useTransition();
  const [lines, setLines] = useState([
    { itemId: riceItems[0]?.id ?? "", quantity: 0, rate: Number(riceItems[0]?.saleRate ?? 0) },
  ]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
  const total = Math.max(0, subtotal - discount);

  function addLine() {
    setLines([...lines, { itemId: riceItems[0]?.id ?? "", quantity: 0, rate: 0 }]);
  }
  function removeLine(i: number) {
    setLines(lines.filter((_, idx) => idx !== i));
  }
  function update(i: number, field: "itemId" | "quantity" | "rate", value: any) {
    const next = [...lines];
    if (field === "itemId") {
      const it = riceItems.find((p) => p.id === value);
      next[i] = { ...next[i], itemId: value, rate: Number(it?.saleRate ?? 0) };
    } else {
      next[i] = { ...next[i], [field]: Number(value) };
    }
    setLines(next);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const { createSale } = await import("./actions");
        await createSale({
          customerId: fd.get("customerId") as string,
          date: fd.get("date") as string,
          discount: Number(fd.get("discount") || 0),
          paidAmount: Number(fd.get("paidAmount") || 0),
          notes: (fd.get("notes") as string) || undefined,
          items: lines.filter((l) => l.itemId && l.quantity > 0),
        });
        router.push("/sales");
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  if (customers.length === 0 || riceItems.length === 0) {
    const msg =
      customers.length === 0 && riceItems.length === 0
        ? t("sale.needBoth")
        : customers.length === 0
        ? t("sale.needCustomer")
        : t("sale.needRice");
    return <div className="card p-6 text-center text-sm text-gray-600">{msg}</div>;
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="card grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <label className="label">{t("sale.customer")} *</label>
          <select name="customerId" required className="input">
            {customers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("sale.date")}</label>
          <input name="date" type="date" required defaultValue={today()} className="input" />
        </div>
        <div>
          <label className="label">{t("pur.form.note")}</label>
          <input name="notes" className="input" />
        </div>
      </div>

      <div className="card p-5">
        <p className="mb-3 font-semibold">{t("pur.form.items")}</p>
        <div className="space-y-2">
          {lines.map((l, i) => {
            const it = riceItems.find((p) => p.id === l.itemId);
            return (
              <div key={i} className="grid grid-cols-12 gap-2">
                <select value={l.itemId} onChange={(e) => update(i, "itemId", e.target.value)} className="input col-span-5">
                  {riceItems.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({t("inv.currentStock")}: {fmt(p.currentStock)})</option>
                  ))}
                </select>
                <input type="number" step="1" placeholder={t("pur.form.qty")} value={l.quantity || ""} onChange={(e) => update(i, "quantity", e.target.value)} className="input col-span-3" />
                <input type="number" step="1" placeholder={t("pur.form.rate")} value={l.rate || ""} onChange={(e) => update(i, "rate", e.target.value)} className="input col-span-2" />
                <div className="col-span-1 flex items-center justify-center text-xs font-medium">৳{fmt(l.quantity * l.rate)}</div>
                <button type="button" onClick={() => removeLine(i)} className="col-span-1 flex items-center justify-center text-red-500 hover:bg-red-50 rounded">
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={addLine} className="btn-secondary mt-3 text-sm">
          <Plus size={14} /> {t("pur.form.addItem")}
        </button>
        {lines.map((l, i) => {
          const it = riceItems.find((p) => p.id === l.itemId);
          if (it && l.quantity > Number(it.currentStock)) {
            return <p key={`warn-${i}`} className="mt-2 text-xs text-red-600">⚠ {it.name} — {t("inv.currentStock")} ⚠</p>;
          }
          return null;
        })}
      </div>

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="label">{t("pur.form.discount")}</label>
            <input name="discount" type="number" step="1" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="label">{t("pur.form.paidAmount")}</label>
            <input name="paidAmount" type="number" step="1" value={paid || ""} onChange={(e) => setPaid(Number(e.target.value))} className="input" />
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 text-sm">
          <Row label={t("pur.form.subtotal")} value={`৳${fmt(subtotal)}`} />
          <Row label={t("pur.form.discount")} value={`−৳${fmt(discount)}`} />
          <div className="my-2 border-t border-gray-200" />
          <Row label={t("sale.total")} value={`৳${fmt(total)}`} bold />
          <Row label={t("sale.paid")} value={`৳${fmt(paid)}`} />
          <Row label={t("sale.due")} value={`৳${fmt(Math.max(0, total - paid))}`} danger />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending && <Loader2 size={16} className="animate-spin" />}
          {t("sale.form.submit")}
        </button>
      </div>
    </form>
  );
}

function Row({ label, value, bold, danger }: { label: string; value: string; bold?: boolean; danger?: boolean }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-gray-600">{label}</span>
      <span className={`${bold ? "font-bold text-gray-900" : ""} ${danger ? "text-red-600" : ""}`}>{value}</span>
    </div>
  );
}
function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n || 0);
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
