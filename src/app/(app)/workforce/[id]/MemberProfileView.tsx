"use client";

import { unwrap } from "@/lib/action-result";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { formatTaka, formatDate, todayLocalISO } from "@/lib/utils";
import { ArrowLeft, Plus, LogOut, Wallet, Trash2, Calendar, FileText, CheckCircle2, Printer } from "lucide-react";
import { createWorkforceTransaction, deleteWorkforceTransaction } from "../actions";

type Transaction = {
  id: string;
  date: any;
  type: string; // BILL | PAYMENT
  amount: number;
  paymentMethod: string | null;
  description: string | null;
};

type Member = {
  id: string;
  name: string;
  phone: string | null;
  designation: string | null;
  rateType: string;
  rateAmount: number;
  balance: number;
  active: boolean;
  transactions: Transaction[];
};

export function MemberProfileView({ member, lang }: { member: Member; lang: string }) {
  const isEn = lang === "en";
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleTransactionSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    try {
      unwrap(await createWorkforceTransaction(formData));
      setShowBillModal(false);
      setShowPaymentModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTransaction(id: string) {
    if (
      !confirm(
        isEn
          ? "Are you sure you want to delete this transaction? The worker's balance and the main accounts expense will adjust automatically."
          : "আপনি কি নিশ্চিত যে এই লেনদেনটি মুছে ফেলতে চান? কর্মীর প্রদেয় ব্যালেন্স এবং প্রধান খতিয়ানের খরচ স্বয়ংক্রিয়ভাবে সমন্বয় হবে।"
      )
    )
      return;

    try {
      unwrap(await deleteWorkforceTransaction(id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  function getRateTypeLabel(type: string) {
    if (isEn) {
      switch (type) {
        case "DAILY":
          return "Daily";
        case "MONTHLY":
          return "Monthly";
        case "PIECE":
          return "Piece-rate";
        default:
          return type;
      }
    } else {
      switch (type) {
        case "DAILY":
          return "দৈনিক";
        case "MONTHLY":
          return "মাসিক";
        case "PIECE":
          return "বস্তা প্রতি";
        default:
          return type;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* নেভিগেশন হেডার */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex flex-col">
          <Link href="/workforce" className="btn-ghost mb-2 -ml-2 self-start">
            <ArrowLeft size={16} /> {isEn ? "Back" : "ফিরে যান"}
          </Link>
          <PageHeader title={member.name} subtitle={member.designation || (isEn ? "Workforce Member" : "কর্মীবাহিনীর সদস্য")} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowBillModal(true)}
            className="btn bg-[#7c3aed] text-white hover:bg-violet-700 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5"
          >
            <Plus size={14} />
            {isEn ? "Add Bill" : "কাজ/বিল যোগ"}
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="btn bg-emerald-600 text-white hover:bg-emerald-700 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5"
          >
            <Wallet size={14} />
            {isEn ? "Record Payment" : "মজুরি পরিশোধ"}
          </button>
        </div>
      </div>

      {/* কর্মী মেটাডেটা ও ব্যালেন্স */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-gradient">
          <p className="text-xs text-gray-500">{isEn ? "Wage Information" : "মজুরি বিবরণী"}</p>
          <p className="text-base font-bold text-gray-900 mt-2">
            {formatTaka(member.rateAmount, lang)} / {getRateTypeLabel(member.rateType)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {isEn ? "Rate applied per cycle" : "কাজের ধরন অনুযায়ী রেট"}
          </p>
        </Card>

        <Card className="card-gradient">
          <p className="text-xs text-gray-500">{isEn ? "Phone Number" : "মোবাইল নম্বর"}</p>
          <p className="text-base font-bold text-gray-900 mt-2 font-mono">
            {member.phone || "—"}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {isEn ? "Contact number" : "যোগাযোগের ফোন নম্বর"}
          </p>
        </Card>

        <Card className="card-gradient">
          <p className="text-xs text-gray-500">{isEn ? "Outstanding Wage Due" : "প্রদেয় বকেয়া মজুরি"}</p>
          <p className={`text-xl font-bold mt-1 ${member.balance > 0 ? "text-amber-600" : "text-slate-800"}`}>
            {formatTaka(member.balance, lang)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {isEn ? "Mill's payable balance" : "মিলের পক্ষ থেকে কর্মী পাবেন"}
          </p>
        </Card>
      </div>

      {/* লেজার টেবিল */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900">{isEn ? "Transaction History" : "লেনদেনের বিবরণ ও খতিয়ান"}</h3>
        
        {member.transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-xs text-gray-500">
            {isEn ? "No transactions recorded yet" : "কোনো লেনদেন পাওয়া যায়নি"}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                    <th className="px-4 py-3">{isEn ? "Date" : "তারিখ"}</th>
                    <th className="px-4 py-3">{isEn ? "Type" : "ধরন"}</th>
                    <th className="px-4 py-3">{isEn ? "Description" : "বিবরণ"}</th>
                    <th className="px-4 py-3">{isEn ? "Method" : "পেমেন্ট মাধ্যম"}</th>
                    <th className="px-4 py-3 text-right">{isEn ? "Amount" : "পরিমাণ"}</th>
                    <th className="px-4 py-3 text-center">{isEn ? "Actions" : "অ্যাকশন"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {member.transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 text-gray-400 font-mono">
                        {formatDate(t.date, lang)}
                      </td>
                      <td className="px-4 py-3">
                        {t.type === "BILL" ? (
                          <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-medium text-[#7c3aed] border border-violet-100/50">
                            {isEn ? "Work Bill" : "কাজ / বিল"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-100/50">
                            {isEn ? "Paid Wages" : "মজুরি পরিশোধ"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{t.description || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-500">
                        {t.paymentMethod ? (isEn ? t.paymentMethod : (t.paymentMethod === "CASH" ? "নগদ" : t.paymentMethod === "BANK" ? "ব্যাংক" : "মোবাইল ব্যাংকিং")) : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold text-sm ${t.type === "BILL" ? "text-[#7c3aed]" : "text-emerald-600"}`}>
                        {t.type === "BILL" ? "+" : "-"} {formatTaka(t.amount, lang)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/workforce/transactions/${t.id}/print`}
                            target="_blank"
                            className="text-slate-500 hover:text-[#7c3aed] font-medium inline-flex items-center gap-1 p-1 rounded transition"
                            title={isEn ? "Print Voucher" : "ভাউচার প্রিন্ট"}
                          >
                            <Printer size={14} />
                            {isEn ? "Print" : "প্রিন্ট"}
                          </Link>
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 p-1 rounded"
                          >
                            <Trash2 size={12} />
                            {isEn ? "Delete" : "মুছুন"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* কাজ/বিল যুক্ত করার মডেল */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <FileText size={16} className="text-[#7c3aed]" />
              {isEn ? "Add Worker Bill" : "কাজ ও বিলের হিসাব যুক্তকরণ"}
            </h3>
            
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <input type="hidden" name="workforceMemberId" value={member.id} />
              <input type="hidden" name="type" value="BILL" />

              <div>
                <label className="label">{isEn ? "Date" : "তারিখ"} *</label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={todayLocalISO()}
                  className="input"
                />
              </div>

              <div>
                <label className="label">{isEn ? "Bill Amount (TK)" : "বিল পরিমাণ (টাকা)"} *</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  defaultValue={member.rateAmount > 0 ? member.rateAmount : ""}
                  className="input"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="label">{isEn ? "Work Details" : "কাজের বিবরণ / বিবরণ"}</label>
                <input
                  type="text"
                  name="description"
                  className="input"
                  placeholder={isEn ? "e.g. Drying work for 5 days" : "যেমন: ৫ দিন বয়লার ড্রাইং এর কাজ"}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  disabled={loading}
                  className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5 px-3 rounded-lg"
                >
                  {isEn ? "Cancel" : "বাতিল"}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn bg-[#7c3aed] text-white hover:bg-violet-700 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1"
                >
                  {loading && <span className="animate-ping h-2 w-2 rounded-full bg-white"></span>}
                  {isEn ? "Save" : "সেভ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* মজুরি পরিশোধ করার মডেল */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              {isEn ? "Record Wage Payment" : "মজুরি ও অর্থ পরিশোধ"}
            </h3>
            
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <input type="hidden" name="workforceMemberId" value={member.id} />
              <input type="hidden" name="type" value="PAYMENT" />

              <div>
                <label className="label">{isEn ? "Date" : "তারিখ"} *</label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={todayLocalISO()}
                  className="input"
                />
              </div>

              <div>
                <label className="label">{isEn ? "Payment Amount (TK)" : "পরিশোধিত অর্থ (টাকা)"} *</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  defaultValue={member.balance > 0 ? member.balance : ""}
                  className="input"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="label">{isEn ? "Payment Method" : "পেমেন্ট মাধ্যম"} *</label>
                <select name="paymentMethod" required className="input" defaultValue="CASH">
                  <option value="CASH">{isEn ? "Cash" : "নগদ"}</option>
                  <option value="BANK">{isEn ? "Bank" : "ব্যাংক"}</option>
                  <option value="MOBILE">{isEn ? "Mobile Banking" : "মোবাইল ব্যাংকিং"}</option>
                </select>
              </div>

              <div>
                <label className="label">{isEn ? "Note / Description" : "বিবরণ"}</label>
                <input
                  type="text"
                  name="description"
                  className="input"
                  placeholder={isEn ? "e.g. Weekly wage payment" : "যেমন: সাপ্তাহিক মজুরি পরিশোধ"}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={loading}
                  className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5 px-3 rounded-lg"
                >
                  {isEn ? "Cancel" : "বাতিল"}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn bg-emerald-600 text-white hover:bg-emerald-700 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1"
                >
                  {loading && <span className="animate-ping h-2 w-2 rounded-full bg-white"></span>}
                  {isEn ? "Save" : "সেভ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
