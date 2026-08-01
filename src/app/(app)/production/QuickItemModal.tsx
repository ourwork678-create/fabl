"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X, Wheat, Package } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { quickCreateInventoryItem } from "./actions";

export function QuickItemModal({
  type,
  onAdded,
}: {
  type: "PADDY" | "RICE";
  onAdded?: () => void;
}) {
  const { lang } = useLang();
  const isEn = lang === "en";
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const isPaddy = type === "PADDY";

  async function handleSave() {
    if (!name.trim()) {
      setError(isEn ? "Please enter a name." : "আইটেমের নাম লিখুন।");
      return;
    }

    setError("");
    setPending(true);

    try {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("type", type);

      await quickCreateInventoryItem(fd);
      setName("");
      setOpen(false);
      router.refresh();
      if (onAdded) onAdded();
    } catch (err: any) {
      setError(err.message || (isEn ? "Failed to save item" : "আইটেম যোগ করতে ব্যর্থ হয়েছে"));
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 border transition-all ${
          isPaddy
            ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
        }`}
      >
        <Plus size={14} />
        {isPaddy
          ? isEn
            ? "Add New Paddy Variety"
            : "নতুন ধানের জাত যোগ করুন"
          : isEn
          ? "Add New Rice Variety"
          : "নতুন চালের ধরণ যোগ করুন"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            {isPaddy ? <Wheat className="text-amber-600" size={18} /> : <Package className="text-indigo-600" size={18} />}
            <h3 className="font-bold text-gray-900 text-sm">
              {isPaddy
                ? isEn
                  ? "Add New Paddy Variety"
                  : "নতুন ধানের জাত যোগ করুন"
                : isEn
                ? "Add New Rice Variety"
                : "নতুন চালের ধরণ যোগ করুন"}
            </h3>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {error && <p className="text-xs font-semibold text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

        <div className="space-y-3 text-xs">
          <div>
            <label className="label">
              {isPaddy
                ? isEn
                  ? "Paddy Name (e.g. Paddy - Red)"
                  : "ধানের নাম (যেমন: ধান - লাল, ধান - স্বর্ণা)"
                : isEn
                ? "Rice Name (e.g. Rice - Katari)"
                : "চালের নাম (যেমন: চাল - কাটারীভোগ, চাল - নাজিরশাইল)"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder={isPaddy ? "যেমন: ধান - গুটি স্বর্ণা" : "যেমন: চাল - কাটারীভোগ"}
              className="input font-semibold"
              autoFocus
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 font-medium">
            {isPaddy
              ? isEn
                ? "Unit: Maund (মণ) - Synced with Inventory"
                : "একক: মণ (স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে সেভ হবে)"
              : isEn
              ? "Unit: Kg (কেজি) - Synced with Inventory"
              : "একক: কেজি (স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে সেভ হবে)"}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className={`btn-primary flex-1 py-2 font-semibold ${isPaddy ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : isEn ? "Save to Inventory" : "ইনভেন্টরিতে সেভ করুন"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary py-2">
              {isEn ? "Cancel" : "বাতিল"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
