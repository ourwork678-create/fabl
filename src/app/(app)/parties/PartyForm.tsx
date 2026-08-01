"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { useLang } from "@/components/LangProvider";

type PartyData = {
  id?: string;
  code?: string | null;
  name?: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
};

export function PartyForm({
  action,
  redirectTo,
  initialData,
  isSupplier = false,
}: {
  action: (formData: FormData) => Promise<void>;
  redirectTo: string;
  initialData?: PartyData;
  isSupplier?: boolean;
}) {
  const router = useRouter();
  const { lang } = useLang();
  const isEn = lang === "en";
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await action(fd);
        router.push(redirectTo);
        router.refresh();
      } catch (err: any) {
        console.error("Save Party Error:", err);
        setError(err.message || (isEn ? "Failed to save information" : "তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে"));
      }
    });
  }

  const prefix = isSupplier ? "S-" : "C-";

  return (
    <form onSubmit={submit} className="card space-y-4 p-5 sm:p-6 shadow-sm border border-slate-100 bg-white rounded-2xl">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">{isEn ? "ID Code" : "আইডি নম্বর / কোড"}</label>
          <input
            name="code"
            defaultValue={initialData?.code || ""}
            className="input font-mono font-bold text-gray-900"
            placeholder={isEn ? `e.g. ${prefix}101` : `যেমন: ${prefix}১০১`}
          />
          <p className="text-[10px] text-gray-400 mt-0.5">{isEn ? "Auto-assigned if left blank" : "ফাঁকা রাখলে স্বয়ংক্রিয় বসবে"}</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label">{isEn ? "Full Name" : "পূর্ণ নাম"} *</label>
          <input
            name="name"
            required
            defaultValue={initialData?.name || ""}
            className="input font-semibold text-gray-900"
            placeholder={isEn ? "Enter full name" : "নাম লিখুন"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">{isEn ? "Mobile Phone" : "মোবাইল নম্বর"}</label>
          <input
            name="phone"
            defaultValue={initialData?.phone || ""}
            className="input font-semibold"
            placeholder="01XXXXXXXXX"
          />
        </div>
        <div>
          <label className="label">{isEn ? "Address" : "ঠিকানা / গ্রাম / বাজার"}</label>
          <input
            name="address"
            defaultValue={initialData?.address || ""}
            className="input font-semibold"
            placeholder={isEn ? "e.g. Mirpur, Dhaka" : "যেমন: শেরপুর, বগুড়া"}
          />
        </div>
      </div>

      <div>
        <label className="label">{isEn ? "Notes" : "নোট (ঐচ্ছিক)"}</label>
        <textarea
          name="notes"
          defaultValue={initialData?.notes || ""}
          className="input"
          rows={2}
          placeholder={isEn ? "Optional notes..." : "অন্যান্য তথ্য..."}
        />
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto px-6 py-2.5 font-semibold">
          {pending && <Loader2 size={16} className="animate-spin" />}
          {isEn ? "Save Info" : "তথ্য সংরক্ষণ করুন"} <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}
