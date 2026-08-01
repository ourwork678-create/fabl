"use client";

import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { todayLocalISO } from "@/lib/utils";
import { addUtilityExpense } from "./actions";
import { Loader2, Plus, Zap } from "lucide-react";

const UTILITY_CATEGORIES = [
  { value: "বিদ্যুৎ", labelBn: "বিদ্যুৎ বিল", labelEn: "Electricity Bill" },
  { value: "জ্বালানি", labelBn: "জেনারেটর / ফুয়েল খরচ", labelEn: "Generator / Fuel" },
  { value: "পানি", labelBn: "পানি ও ইউটিলিটি বিল", labelEn: "Water & Utility Bill" },
  { value: "ইন্টারনেট", labelBn: "ইন্টারনেট ও টেলিফোন বিল", labelEn: "Internet & Phone" },
  { value: "অন্যান্য বিল", labelBn: "অন্যান্য আনুষঙ্গিক বিল", labelEn: "Other Utility Bills" },
];

export function UtilityForm() {
  const { lang } = useLang();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isEn = lang === "en";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    try {
      await addUtilityExpense(fd);
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || (isEn ? "Failed to save bill" : "বিল সংরক্ষণ করতে ব্যর্থ হয়েছে"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-amber-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Zap className="text-amber-500 shrink-0" size={18} />
        <h3 className="font-bold text-gray-900 text-sm">
          {isEn ? "Add Utility / Electricity Bill" : "নতুন বিদ্যুৎ ও বিল যোগ করুন"}
        </h3>
      </div>

      {error && <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg">{error}</p>}
      {success && (
        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg">
          ✓ {isEn ? "Bill saved successfully!" : "বিল সফলভাবে সংরক্ষণ ও ডেটাবেসে কাউন্ট হয়েছে!"}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ক্যাটাগরি */}
        <div>
          <label className="label">{isEn ? "Bill Category" : "বিলের ধরণ/ক্যাটাগরি"}</label>
          <select name="category" className="input font-semibold text-gray-900" required>
            {UTILITY_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {isEn ? c.labelEn : c.labelBn}
              </option>
            ))}
          </select>
        </div>

        {/* টাকার পরিমাণ */}
        <div>
          <label className="label">{isEn ? "Amount (Tk)" : "টাকার পরিমাণ (টাকা)"}</label>
          <input
            type="number"
            step="0.01"
            name="amount"
            placeholder="0.00"
            className="input font-semibold text-gray-900"
            required
          />
        </div>

        {/* পেমেন্ট মাধ্যম */}
        <div>
          <label className="label">{isEn ? "Payment Method" : "পরিশোধের মাধ্যম"}</label>
          <select name="paymentMethod" className="input font-semibold text-gray-900">
            <option value="CASH">{isEn ? "Cash" : "নগদ ক্যাশ"}</option>
            <option value="BANK">{isEn ? "Bank" : "ব্যাংক একাউন্ট"}</option>
            <option value="MOBILE">{isEn ? "Mobile Banking" : "মোবাইল ব্যাংকিং (বিকাশ/নগদ)"}</option>
          </select>
        </div>

        {/* তারিখ */}
        <div>
          <label className="label">{isEn ? "Date" : "তারিখ"}</label>
          <input
            type="date"
            name="date"
            defaultValue={todayLocalISO()}
            className="input font-semibold"
          />
        </div>
      </div>

      {/* নোট/বিবরণ */}
      <div>
        <label className="label">{isEn ? "Description / Bill Ref No" : "বিবরণ / বিলের রসিদ নম্বর"}</label>
        <input
          type="text"
          name="description"
          placeholder={isEn ? "e.g. July electricity bill, Meter #1029" : "যেমন: জুলাই মাসের বিদ্যুৎ বিল, মিটার #১০২৯"}
          className="input"
        />
      </div>

      <button type="submit" disabled={pending} className="btn bg-amber-500 text-white hover:bg-amber-600 w-full py-2.5 font-semibold">
        {pending ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <>
            <Plus size={16} />
            {isEn ? "Save Bill Entry" : "বিল ডেটাবেসে জমা করুন"}
          </>
        )}
      </button>
    </form>
  );
}
