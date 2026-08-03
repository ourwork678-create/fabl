"use client";

import { unwrap } from "@/lib/action-result";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Calendar, Wheat, Package, Plus, Trash2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { QuickItemModal } from "./QuickItemModal";

type Item = { id: string; name: string; type: string; unit: string; currentStock: any };

export function ProductionForm({
  paddyItems,
  outputItems,
}: {
  paddyItems: Item[];
  outputItems: Item[];
}) {
  const router = useRouter();
  const { t, lang } = useLang();
  const isEn = lang === "en";
  const [pending, start] = useTransition();

  // ১. ইনপুট ধান (ডাইনামিক ড্রপডাউন সারি)
  const [inputs, setInputs] = useState([
    { itemId: paddyItems[0]?.id ?? "", quantity: 0 },
  ]);

  // ২. স্থায়ী উপজাতসমূহ (খুদ, গুঁড়া, তুষ) — নামে মেলানো; অনুপস্থিত হলে undefined
  // বাংলা ইউনিকোডের দুই রূপ (precomposed/decomposed) মিলাতে NFC নরমালাইজ করে খোঁজা
  const nameHas = (o: Item, key: string) => o.name.normalize("NFC").toLowerCase().includes(key.normalize("NFC").toLowerCase());
  const khudItem = outputItems.find((o) => nameHas(o, "খুদ") || nameHas(o, "broken"));
  const guraItem = outputItems.find((o) => nameHas(o, "গুঁড়া") || nameHas(o, "কুঁড়া") || nameHas(o, "bran"));
  const tushItem = outputItems.find((o) => nameHas(o, "তুষ") || nameHas(o, "husk"));

  const [khudQty, setKhudQty] = useState<number | "">(0);
  const [guraQty, setGuraQty] = useState<number | "">(0);
  const [tushQty, setTushQty] = useState<number | "">(0);

  // ৩. চালের আউটপুটসমূহ (ডাইনামিক ড্রপডাউন সারি)
  const riceItems = outputItems.filter((o) => o.type === "RICE");
  const [riceOutputs, setRiceOutputs] = useState(
    riceItems.length > 0
      ? riceItems.map((r) => ({ itemId: r.id, quantity: 0 }))
      : [{ itemId: "", quantity: 0 }]
  );

  // ধানের ইনপুট নিয়ন্ত্রণ
  function setInputLine(i: number, field: string, val: any) {
    const next = [...inputs];
    next[i] = { ...next[i], [field]: val };
    setInputs(next);
  }
  function addInputRow() {
    setInputs([...inputs, { itemId: paddyItems[0]?.id ?? "", quantity: 0 }]);
  }
  function removeInputRow(i: number) {
    if (inputs.length > 1) {
      setInputs(inputs.filter((_, idx) => idx !== i));
    } else {
      setInputs([{ itemId: paddyItems[0]?.id ?? "", quantity: 0 }]);
    }
  }

  // চালের আউটপুট নিয়ন্ত্রণ
  function setRiceLine(i: number, field: string, val: any) {
    const next = [...riceOutputs];
    next[i] = { ...next[i], [field]: val };
    setRiceOutputs(next);
  }
  function addRiceRow() {
    setRiceOutputs([...riceOutputs, { itemId: riceItems[0]?.id ?? "", quantity: 0 }]);
  }
  function removeRiceRow(i: number) {
    if (riceOutputs.length > 1) {
      setRiceOutputs(riceOutputs.filter((_, idx) => idx !== i));
    } else {
      setRiceOutputs([{ itemId: riceItems[0]?.id ?? "", quantity: 0 }]);
    }
  }

  // হিসাবসমূহ
  // ১. মোট ধানের ইনপুট (মণ)
  const totalPaddyInputMaund = inputs.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  // ধানের পরিমাণ কেজিতে রূপান্তর (১ মণ = ৪০ কেজি)
  const totalPaddyInputKg = totalPaddyInputMaund * 40;

  // ২. মোট উৎপাদিত চাল (কেজি)
  const totalRiceOutputKg = riceOutputs.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  // ৩. উত্তোলন হার (Recovery Rate %) = (উৎপাদিত চাল (কেজি) / ধানের পরিমাণ (কেজি)) * ১০০
  const recoveryRate = totalPaddyInputKg > 0 ? (totalRiceOutputKg / totalPaddyInputKg) * 100 : 0;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const validInputs = inputs.filter((i) => i.itemId && Number(i.quantity) > 0);
    const validOutputs: { itemId: string; quantity: number }[] = [];

    // স্থায়ী উপজাত
    if (khudItem && Number(khudQty) > 0) {
      validOutputs.push({ itemId: khudItem.id, quantity: Number(khudQty) });
    }
    if (guraItem && Number(guraQty) > 0) {
      validOutputs.push({ itemId: guraItem.id, quantity: Number(guraQty) });
    }
    if (tushItem && Number(tushQty) > 0) {
      validOutputs.push({ itemId: tushItem.id, quantity: Number(tushQty) });
    }

    // চালের আউটপুট
    riceOutputs.forEach((r) => {
      if (r.itemId && Number(r.quantity) > 0) {
        validOutputs.push({ itemId: r.itemId, quantity: Number(r.quantity) });
      }
    });

    // ইনভেন্টরিতে আইটেম না থাকলে টাইপ করা পরিমাণ নীরবে বাদ যেত — এখন স্পষ্ট বার্তা
    const missing: string[] = [];
    if (Number(khudQty) > 0 && !khudItem) missing.push("খুদ");
    if (Number(guraQty) > 0 && !guraItem) missing.push("গুঁড়া");
    if (Number(tushQty) > 0 && !tushItem) missing.push("তুষ");
    if (missing.length > 0) {
      alert(
        isEn
          ? `No inventory item found for: ${missing.join(", ")}. Create the item first (Inventory page).`
          : `${missing.join(", ")} নামে কোনো ইনভেন্টরি আইটেম নেই — আগে ইনভেন্টরি পেজ থেকে আইটেমটি তৈরি করুন, নাহলে এই পরিমাণ সংরক্ষণ হবে না।`
      );
      return;
    }

    if (validInputs.length === 0) {
      alert(isEn ? "Please select Paddy and enter quantity (Maund)." : "অনুগ্রহ করে অন্তত একটি ধানের জাত ড্রপডাউন থেকে সিলেক্ট করে পরিমাণ (মণ) লিখুন।");
      return;
    }
    if (validOutputs.length === 0) {
      alert(isEn ? "Please enter quantity for produced Rice or Byproducts." : "অনুগ্রহ করে অন্তত একটি উৎপাদিত চাল বা উপজাতের পরিমাণ লিখুন।");
      return;
    }

    start(async () => {
      try {
        const { createBatch } = await import("./actions");
        unwrap(await createBatch({
          date: fd.get("date") as string,
          notes: (fd.get("notes") as string) || undefined,
          recoveryRate: Number(recoveryRate.toFixed(2)),
          inputs: validInputs,
          outputs: validOutputs,
        }));
        router.push("/production");
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* তারিখ হেডার কার্ড */}
      <div className="card p-5 border border-slate-100 bg-white shadow-xs">
        <div className="max-w-xs">
          <label className="label font-semibold text-gray-700 flex items-center gap-1.5 mb-1">
            <Calendar size={15} className="text-brand-600" />
            {isEn ? "Production Date" : "উৎপাদন তারিখ"}
          </label>
          <input name="date" type="date" required defaultValue={today()} className="input font-semibold" />
        </div>
      </div>

      {/* ১. ইনপুট (ধান) */}
      <div className="card p-5 border border-slate-100 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2">
            <Wheat size={18} className="text-amber-600" />
            <h3 className="font-bold text-gray-900 text-sm">{t("prod.form.inputSection")}</h3>
          </div>
          <QuickItemModal type="PADDY" />
        </div>

        <div className="space-y-2.5">
          {inputs.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2.5 items-center">
              <select
                value={l.itemId}
                onChange={(e) => setInputLine(i, "itemId", e.target.value)}
                className="input col-span-7 font-semibold text-gray-900"
              >
                {paddyItems.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({t("inv.currentStock")}: {fmt(p.currentStock)} {p.unit})
                  </option>
                ))}
              </select>

              <input
                type="number"
                step="any"
                placeholder={isEn ? "Quantity (Maund)" : "পরিমাণ (মণ)"}
                value={l.quantity || ""}
                onChange={(e) => setInputLine(i, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                className="input col-span-4 font-bold text-gray-900"
              />

              <button
                type="button"
                onClick={() => removeInputRow(i)}
                className="col-span-1 flex items-center justify-center text-red-500 hover:text-red-700"
                title={isEn ? "Remove" : "মুছুন"}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addInputRow}
          className="btn bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold py-1.5 px-3 rounded-lg border border-amber-200"
        >
          <Plus size={14} />
          {isEn ? "Add Paddy Input Line" : "ধানের ইনপুট লাইন যোগ করুন"}
        </button>
      </div>

      {/* ২. আউটপুট (চাল ও উপজাত) */}
      <div className="card p-5 border border-slate-100 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-indigo-600" />
            <h3 className="font-bold text-gray-900 text-sm">{t("prod.form.outputSection")}</h3>
          </div>
        </div>

        {/* ১. স্থায়ী উপজাতসমূহ */}
        <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
            {isEn ? "Standard Byproducts" : "১. স্থায়ী উপজাতসমূহ"}
          </p>

          {/* খুদ (কেজি) */}
          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="input col-span-7 bg-white font-semibold text-gray-900 flex items-center justify-between">
              <span>খুদ</span>
              <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-mono border border-purple-100">উপজাত (কেজি)</span>
            </div>
            <input
              type="number"
              step="any"
              placeholder={isEn ? "Quantity (Kg)" : "উৎপাদন পরিমাণ (কেজি)"}
              value={khudQty || ""}
              onChange={(e) => setKhudQty(e.target.value === "" ? "" : Number(e.target.value))}
              className="input col-span-5 font-bold text-gray-900"
            />
          </div>

          {/* গুঁড়া (বস্তা) */}
          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="input col-span-7 bg-white font-semibold text-gray-900 flex items-center justify-between">
              <span>গুঁড়া</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono border border-emerald-100">উপজাত (বস্তা)</span>
            </div>
            <input
              type="number"
              step="any"
              placeholder={isEn ? "Quantity (Bags)" : "উৎপাদন পরিমাণ (বস্তা)"}
              value={guraQty || ""}
              onChange={(e) => setGuraQty(e.target.value === "" ? "" : Number(e.target.value))}
              className="input col-span-5 font-bold text-gray-900"
            />
          </div>

          {/* তুষ (বস্তা) */}
          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="input col-span-7 bg-white font-semibold text-gray-900 flex items-center justify-between">
              <span>তুষ</span>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-mono border border-amber-100">উপজাত (বস্তা)</span>
            </div>
            <input
              type="number"
              step="any"
              placeholder={isEn ? "Quantity (Bags)" : "উৎপাদন পরিমাণ (বস্তা)"}
              value={tushQty || ""}
              onChange={(e) => setTushQty(e.target.value === "" ? "" : Number(e.target.value))}
              className="input col-span-5 font-bold text-gray-900"
            />
          </div>
        </div>

        {/* ২. চালের ধরণসমূহ (কেজি) */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {isEn ? "Produced Rice Varieties (Kg)" : "২. উৎপাদিত চালের ধরণসমূহ (কেজি)"}
            </p>
            <QuickItemModal type="RICE" />
          </div>

          {riceOutputs.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2.5 items-center">
              <select
                value={l.itemId}
                onChange={(e) => setRiceLine(i, "itemId", e.target.value)}
                className="input col-span-7 font-bold text-gray-900"
              >
                {riceItems.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (চাল - কেজি)
                  </option>
                ))}
              </select>

              <input
                type="number"
                step="any"
                placeholder={isEn ? "Production Qty (Kg)" : "উৎপাদন পরিমাণ (কেজি)"}
                value={l.quantity || ""}
                onChange={(e) => setRiceLine(i, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                className="input col-span-4 font-bold text-gray-900"
              />

              <button
                type="button"
                onClick={() => removeRiceRow(i)}
                className="col-span-1 flex items-center justify-center text-red-500 hover:text-red-700"
                title={isEn ? "Remove" : "মুছুন"}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRiceRow}
            className="btn bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold py-1.5 px-3 rounded-lg border border-indigo-200"
          >
            <Plus size={14} />
            {isEn ? "Add Rice Output Line" : "চালের আউটপুট লাইন যোগ করুন"}
          </button>
        </div>
      </div>

      {/* নোট ও রিকভারি রেট সামারি */}
      <div className="card grid gap-4 p-5 sm:grid-cols-2 border border-slate-100 bg-white shadow-xs">
        <div>
          <label className="label">{t("pur.form.note")}</label>
          <input name="notes" placeholder={isEn ? "Optional notes..." : "কোনো নোট থাকলে লিখুন..."} className="input" />
        </div>

        <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-1.5 border border-slate-200/60">
          <Row label={isEn ? "Total Paddy Input" : "মোট ব্যবহৃত ধান"} value={`${fmt(totalPaddyInputMaund)} মণ (${fmt(totalPaddyInputKg)} কেজি)`} bold />
          <Row label={isEn ? "Total Rice Output" : "মোট উৎপাদিত চাল"} value={`${fmt(totalRiceOutputKg)} কেজি`} bold color="text-indigo-700" />
          <div className="my-1.5 border-t border-slate-200" />
          <Row
            label={isEn ? "Recovery Rate = Rice(kg) / Paddy(kg)" : "উত্তোলন হার = চাল (কেজি) / ধান (কেজি)"}
            value={`${recoveryRate.toFixed(2)}%`}
            bold
            color="text-emerald-700 text-sm font-extrabold"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary py-2.5 px-6 font-semibold">
          {pending && <Loader2 size={16} className="animate-spin" />}
          {t("prod.form.submit")}
        </button>
      </div>
    </form>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-gray-600 font-medium">{label}</span>
      <span className={color ? color : bold ? "font-bold text-gray-900" : "font-semibold text-gray-700"}>{value}</span>
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
