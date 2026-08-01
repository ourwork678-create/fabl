"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";

import { QuickItemModal } from "../production/QuickItemModal";

type Item = { id: string; name: string; unit: string; saleRate: any };
type Supplier = { id: string; name: string };

export function PurchaseForm({
  suppliers,
  paddyItems,
}: {
  suppliers: Supplier[];
  paddyItems: Item[];
}) {
  const router = useRouter();
  const { t } = useLang();
  const [pending, start] = useTransition();
  const [lines, setLines] = useState([
    { itemId: paddyItems[0]?.id ?? "", quantity: 0, rate: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
  const total = Math.max(0, subtotal - discount);

  function addLine() {
    setLines([...lines, { itemId: paddyItems[0]?.id ?? "", quantity: 0, rate: 0 }]);
  }
  function removeLine(i: number) {
    setLines(lines.filter((_, idx) => idx !== i));
  }
  function update(i: number, field: "itemId" | "quantity" | "rate", value: any) {
    const next = [...lines];
    if (field === "itemId") {
      next[i] = { ...next[i], itemId: value, rate: 0 };
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
        const { createPurchase } = await import("./actions");
        await createPurchase({
          supplierId: fd.get("supplierId") as string,
          date: fd.get("date") as string,
          discount: Number(fd.get("discount") || 0),
          paidAmount: Number(fd.get("paidAmount") || 0),
          notes: (fd.get("notes") as string) || undefined,
          items: lines.filter((l) => l.itemId && l.quantity > 0),
        });
        router.push("/purchases");
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  if (suppliers.length === 0) {
    return <div className="card p-6 text-center text-sm text-gray-600">{t("pur.needSupplier")}</div>;
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="card grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <label className="label">{t("pur.supplier")} *</label>
          <select name="supplierId" required className="input">
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("pur.date")}</label>
          <input name="date" type="date" required defaultValue={today()} className="input" />
        </div>
        <div>
          <label className="label">{t("pur.form.note")}</label>
          <input name="notes" className="input" />
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between border-b pb-2.5 mb-3">
          <p className="font-semibold text-gray-900">{t("pur.form.items")}</p>
          <QuickItemModal type="PADDY" />
        </div>
        <div className="space-y-2.5">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2.5 items-center">
              <select
                value={l.itemId}
                onChange={(e) => update(i, "itemId", e.target.value)}
                className="input col-span-5 font-semibold text-gray-900"
              >
                {paddyItems.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                type="number"
                step="1"
                placeholder="পরিমাণ (মণ)"
                value={l.quantity || ""}
                onChange={(e) => update(i, "quantity", e.target.value)}
                className="input col-span-3 font-bold text-gray-900"
              />
              <input
                type="number"
                step="1"
                placeholder="দর (টাকা/মণ)"
                value={l.rate || ""}
                onChange={(e) => update(i, "rate", e.target.value)}
                className="input col-span-2 font-bold text-gray-900"
              />
              <div className="col-span-1 text-right font-bold text-gray-900 text-xs">
                ৳{fmt(l.quantity * l.rate)}
              </div>
              <button type="button" onClick={() => removeLine(i)} className="col-span-1 flex items-center justify-center text-red-500 hover:text-red-700 p-1">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addLine} className="btn bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold py-1.5 px-3 rounded-lg border border-amber-200 mt-3">
          <Plus size={14} /> {t("pur.form.addItem")}
        </button>
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
          <Row label={t("pur.total")} value={`৳${fmt(total)}`} bold />
          <Row label={t("pur.paid")} value={`৳${fmt(paid)}`} />
          <Row label={t("pur.due")} value={`৳${fmt(Math.max(0, total - paid))}`} danger />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending && <Loader2 size={16} className="animate-spin" />}
          {t("pur.form.submit")}
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
