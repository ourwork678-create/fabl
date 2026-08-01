"use client";

import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { formatTaka, todayLocalISO } from "@/lib/utils";
import { createByproductSale } from "./actions";
import { Boxes, Loader2, Plus, Calculator } from "lucide-react";

type Customer = { id: string; name: string };

export function ByproductForm({
  customers,
}: {
  customers: Customer[];
}) {
  const { lang } = useLang();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [quantity, setQuantity] = useState<number | "">(10);
  const [rate, setRate] = useState<number | "">(850);
  const [paidAmount, setPaidAmount] = useState<number | "">(8500);

  // নির্বাচিত উপজাত অনুযায়ী একক দেখানো (খুদ কেজিতে, গুঁড়া/তুষ বস্তায়)
  const [selectedByproduct, setSelectedByproduct] = useState("");
  const isKhud = selectedByproduct.normalize("NFC") === "খুদ".normalize("NFC");
  const bpUnitBn = isKhud ? "কেজি" : "বস্তা";
  const bpUnitEn = isKhud ? "Kg" : "Bag";

  const isEn = lang === "en";

  const numQty = Number(quantity) || 0;
  const numRate = Number(rate) || 0;
  const totalAmount = numQty * numRate;
  const numPaid = Number(paidAmount) || 0;
  const dueAmount = Math.max(0, totalAmount - numPaid);

  function handleQtyChange(val: number) {
    setQuantity(val);
  }

  function handleRateChange(val: number) {
    setRate(val);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    try {
      await createByproductSale(fd);
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      setQuantity(10);
      setRate(850);
      setPaidAmount(8500);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || (isEn ? "Failed to save sale" : "বিক্রয় সংরক্ষণ করতে ব্যর্থ হয়েছে"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-teal-100 bg-white p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Boxes className="text-teal-600 shrink-0" size={18} />
        <h3 className="font-bold text-gray-900 text-sm">
          {isEn ? "New Byproduct Sale Entry (Rice Bran / Broken Rice / Husk)" : "নতুন উপজাত (গুঁড়া/খুদ/তুষ) বিক্রয় এন্ট্রি"}
        </h3>
      </div>

      {error && <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg">{error}</p>}
      {success && (
        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg">
          ✓ {isEn ? "Byproduct sale saved & total sales updated!" : "উপজাত বিক্রয় সফলভাবে সংরক্ষিত ও মোট আয়ে যুক্ত হয়েছে!"}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* উপজাত নির্বাচন */}
        <div>
          <label className="label">{isEn ? "Select Byproduct" : "উপজাতের ধরণ"}</label>
          <select name="byproductName" className="input font-semibold text-gray-900" onChange={(e) => setSelectedByproduct(e.target.value)} required defaultValue="গুঁড়া">
            <option value="গুঁড়া">{isEn ? "Rice Bran (গুঁড়া)" : "গুঁড়া"}</option>
            <option value="খুদ">{isEn ? "Broken Rice (খুদ)" : "খুদ"}</option>
            <option value="তুষ">{isEn ? "Husk (তুষ)" : "তুষ"}</option>
          </select>
        </div>

        {/* কাস্টমার নির্বাচন */}
        <div>
          <label className="label">{isEn ? "Customer / Buyer" : "ক্রেতা / কাস্টমার"}</label>
          <select name="customerId" className="input">
            <option value="">+ {isEn ? "New Customer / Cash Sales" : "নগদ ক্রেতা / নতুন কাস্টমার"}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* বিক্রয়ের পরিমাণ (বস্তা / মণ) */}
        <div>
          <label className="label">{isEn ? `Quantity (${bpUnitEn})` : `বিক্রয়ের পরিমাণ (${bpUnitBn})`}</label>
          <input
            type="number"
            step="any"
            name="quantity"
            value={quantity}
            onChange={(e) => handleQtyChange(Number(e.target.value))}
            placeholder="0"
            className="input font-semibold text-gray-900"
            required
          />
        </div>

        {/* দর / বস্তা প্রতি দাম */}
        <div>
          <label className="label">{isEn ? `Rate (Tk / ${bpUnitEn})` : `দর (টাকা প্রতি ${bpUnitBn})`}</label>
          <input
            type="number"
            step="any"
            name="rate"
            value={rate}
            onChange={(e) => handleRateChange(Number(e.target.value))}
            placeholder="0.00"
            className="input font-semibold text-gray-900"
            required
          />
        </div>

        {/* মোট টাকা (ক্যালকুলেটেড) */}
        <div className="sm:col-span-2 rounded-xl bg-teal-50/70 p-3 border border-teal-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-teal-600 shrink-0" />
            <span className="text-xs font-semibold text-teal-900">{isEn ? "Total Amount:" : "মোট বিক্রয় মূল্য:"}</span>
          </div>
          <span className="text-base sm:text-lg font-bold text-teal-700">
            {formatTaka(totalAmount, lang)}
          </span>
        </div>

        {/* পরিশোধিত টাকা */}
        <div>
          <label className="label">{isEn ? "Paid Amount (Tk)" : "নগদ পরিশোধের টাকা"}</label>
          <input
            type="number"
            step="any"
            name="paidAmount"
            value={paidAmount}
            onChange={(e) => setPaidAmount(Number(e.target.value))}
            placeholder="0.00"
            className="input font-semibold text-emerald-700"
          />
        </div>

        {/* বকেয়া পরিমাণ */}
        <div>
          <label className="label">{isEn ? "Due Amount (Tk)" : "বকেয়া টাকা"}</label>
          <input
            type="text"
            readOnly
            value={`৳ ${dueAmount.toLocaleString("bn-BD")}`}
            className="input bg-slate-50 font-bold text-red-600"
          />
        </div>
      </div>

      {/* তারিখ ও নোট */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">{isEn ? "Date" : "তারিখ"}</label>
          <input
            type="date"
            name="date"
            defaultValue={todayLocalISO()}
            className="input"
          />
        </div>

        <div>
          <label className="label">{isEn ? "Notes" : "নোট (ঐচ্ছিক)"}</label>
          <input
            type="text"
            name="notes"
            placeholder={isEn ? "e.g. Rice bran 50kg bags" : "যেমন: ৫০কেজি সাইজের গুঁড়ার বস্তা"}
            className="input"
          />
        </div>
      </div>

      <button type="submit" disabled={pending} className="btn bg-teal-600 text-white hover:bg-teal-700 w-full py-2.5 font-semibold">
        {pending ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <>
            <Plus size={16} />
            {isEn ? "Complete Byproduct Sale & Generate Invoice" : "উপজাত বিক্রয় সম্পন্ন করুন ও ইনভয়েস তৈরি করুন"}
          </>
        )}
      </button>
    </form>
  );
}
