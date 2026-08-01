"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, ArrowUpRight } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { todayLocalISO } from "@/lib/utils";

export function CashDepositForm() {
  const { lang } = useLang();
  const isEn = lang === "en";
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const { addCashDeposit } = await import("./actions");
        await addCashDeposit(fd);
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn bg-indigo-600 text-white hover:bg-indigo-700 w-full justify-center gap-2 py-2 font-semibold">
        <ArrowUpRight size={16} />
        {isEn ? "Record Cash Deposit (to Bank/Fund)" : "ক্যাশ জমাদান এন্ট্রি (ব্যাংকে/তহবিলে)"}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-4 border border-indigo-200 bg-indigo-50/40">
      <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
        <ArrowUpRight size={16} className="text-indigo-600" />
        <h4 className="font-bold text-xs text-indigo-950">
          {isEn ? "Record Cash Deposit (Bank / Fund Transfer)" : "নতুন ক্যাশ জমাদান রেকর্ড"}
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{isEn ? "Deposit Amount (Tk)" : "জমাকৃত টাকার পরিমাণ"}</label>
          <input name="amount" type="number" step="0.01" required placeholder="0.00" className="input font-bold text-indigo-950" />
        </div>
        <div>
          <label className="label">{isEn ? "Deposit Date" : "তারিখ"}</label>
          <input
            type="date"
            name="date"
            defaultValue={todayLocalISO()}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label">{isEn ? "Payment Method / Medium" : "জমাদানের মাধ্যম"}</label>
        <select name="method" className="input" defaultValue="BANK">
          <option value="BANK">{isEn ? "Bank Account / Slip" : "ব্যাংক একাউন্ট / ডিপোজিট স্লিপ"}</option>
          <option value="CASH">{isEn ? "Hand Cash to Owner/Manager" : "মালিককে হস্তান্তরিত নগদ ক্যাশ"}</option>
          <option value="MOBILE">{isEn ? "Mobile Banking (bKash/Nagad)" : "মোবাইল ব্যাংকিং (বিকাশ/নগদ)"}</option>
        </select>
      </div>

      <div>
        <label className="label">{isEn ? "Bank Name / Reference / Note" : "ব্যাংকের নাম / স্লিপ নং / বিবরণ"}</label>
        <input name="description" className="input" placeholder={isEn ? "e.g. Sonali Bank A/C #1029 deposit" : "যেমন: সোনালী ব্যাংক এসি #১০২৯ ডিপোজিট স্লিপ #৫৫৪"} />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending} className="btn-primary flex-1 bg-indigo-600 hover:bg-indigo-700">
          {pending && <Loader2 size={14} className="animate-spin" />}
          {isEn ? "Save Deposit Entry" : "জমাদান রেকর্ড করুন"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">{isEn ? "Cancel" : "বাতিল"}</button>
      </div>
    </form>
  );
}
