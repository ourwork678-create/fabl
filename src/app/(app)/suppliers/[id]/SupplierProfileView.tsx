"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { formatTaka, formatDate } from "@/lib/utils";
import { ArrowLeft, Wallet, Trash2, Printer, CheckCircle2 } from "lucide-react";
import { recordPayment, deletePayment } from "../../parties/actions";
import { deletePurchase } from "../../purchases/actions";

type LedgerEntry = {
  id: string;
  date: any;
  type: "PURCHASE" | "PAYMENT";
  refNo: string;
  title: string;
  amount: number;
  method?: string;
  details: string;
};

type SupplierData = {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  dueAmount: number;
  notes: string | null;
};

export function SupplierProfileView({
  supplier,
  totalPurchasesAmount,
  ledgerEntries,
  lang,
}: {
  supplier: SupplierData;
  totalPurchasesAmount: number;
  ledgerEntries: LedgerEntry[];
  lang: string;
}) {
  const isEn = lang === "en";
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePaymentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const method = formData.get("method") as string;
    const note = formData.get("note") as string;

    if (!amount || amount <= 0) {
      alert(isEn ? "Enter a valid amount" : "সঠিক পরিমাণ লিখুন");
      return;
    }

    setLoading(true);
    try {
      await recordPayment({
        partyType: "SUPPLIER",
        partyId: supplier.id,
        direction: "PAID",
        amount,
        method,
        note,
      });
      setShowPaymentModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEntry(id: string, type: "PURCHASE" | "PAYMENT") {
    if (
      !confirm(
        isEn
          ? "Are you sure you want to delete this transaction? The supplier balance will adjust automatically."
          : "আপনি কি নিশ্চিত যে এই লেনদেনটি মুছে ফেলতে চান? সাপ্লায়ারের বকেয়া ব্যালেন্স স্বয়ংক্রিয়ভাবে সমন্বয় হবে।"
      )
    )
      return;

    try {
      if (type === "PURCHASE") {
        await deletePurchase(id);
      } else {
        await deletePayment(id);
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  const currentDue = supplier.dueAmount;

  return (
    <div className="space-y-6">
      {/* নেভিগেশন হেডার */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex flex-col">
          <Link href="/suppliers" className="btn-ghost mb-2 -ml-2 self-start">
            <ArrowLeft size={16} /> {isEn ? "Back" : "ফিরে যান"}
          </Link>
          <PageHeader
            title={`${supplier.name} (${supplier.code || `S-${supplier.id.slice(-4)}`})`}
            subtitle={isEn ? "Supplier profile & transaction ledger" : "সাপ্লায়ার প্রোফাইল ও পাওনা খতিয়ান"}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="btn bg-emerald-600 text-white hover:bg-emerald-700 text-xs py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 font-semibold"
          >
            <Wallet size={15} />
            {isEn ? "Record Payment" : "টাকা পরিশোধ"}
          </button>
        </div>
      </div>

      {/* সাপ্লায়ার কার্ডস */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-gradient">
          <p className="text-xs text-gray-500">{isEn ? "Phone & Address" : "মোবাইল ও ঠিকানা"}</p>
          <p className="text-base font-bold text-gray-900 mt-2 font-mono">
            {supplier.phone || "—"}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {supplier.address || (isEn ? "No address provided" : "ঠিকানা দেওয়া হয়নি")}
          </p>
        </Card>

        <Card className="card-gradient">
          <p className="text-xs text-gray-500">{isEn ? "Total Paddy Supplied" : "মোট ধান ক্রয় (বিল)"}</p>
          <p className="text-xl font-bold text-amber-800 mt-1">
            {formatTaka(totalPurchasesAmount, lang)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {isEn ? "Total paddy purchase history" : "সাপ্লায়ার থেকে মোট ধান ক্রয়ের টাকার পরিমাণ"}
          </p>
        </Card>

        <Card className="card-gradient">
          <p className="text-xs text-gray-500">{isEn ? "Outstanding Payable Due" : "প্রদেয় বকেয়া"}</p>
          <p className={`text-xl font-bold mt-1 ${currentDue > 0 ? "text-red-600" : "text-emerald-700"}`}>
            {formatTaka(currentDue, lang)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {currentDue > 0 ? (isEn ? "Mill's net payable balance" : "মিলের কাছে সাপ্লায়ার পাবেন") : (isEn ? "Fully Settled" : "হিসাব সম্পূর্ণ পরিশোধিত")}
          </p>
        </Card>
      </div>

      {/* লেজার খতিয়ান টেবিল */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900">{isEn ? "Transaction History & Ledger" : "লেনদেনের বিবরণ ও খতিয়ান"}</h3>

        {ledgerEntries.length === 0 ? (
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
                  {ledgerEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 text-gray-400 font-mono">
                        {formatDate(e.date, lang)}
                      </td>
                      <td className="px-4 py-3">
                        {e.type === "PURCHASE" ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                            {isEn ? "Paddy Purchase" : "ধান ক্রয় / বিল"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                            {isEn ? "Payment Paid" : "টাকা পরিশোধ"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {e.details}
                        {e.refNo && <div className="text-[10px] text-gray-400 font-mono">মেমো: {e.refNo}</div>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-500">
                        {e.method ? (isEn ? e.method : (e.method === "CASH" ? "নগদ" : e.method === "BANK" ? "ব্যাংক" : "মোবাইল ব্যাংকিং")) : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold text-sm ${e.type === "PURCHASE" ? "text-amber-800" : "text-emerald-600"}`}>
                        {e.type === "PURCHASE" ? "+" : "-"} {formatTaka(e.amount, lang)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={e.type === "PURCHASE" ? `/purchases/${e.id}/print` : `/payments/${e.id}/print`}
                            target="_blank"
                            className="text-slate-500 hover:text-[#7c3aed] font-medium inline-flex items-center gap-1 p-1 rounded transition"
                            title={isEn ? "Print Voucher" : "মেমো প্রিন্ট"}
                          >
                            <Printer size={14} />
                            {isEn ? "Print" : "প্রিন্ট"}
                          </Link>
                          <button
                            onClick={() => handleDeleteEntry(e.id, e.type)}
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

      {/* টাকা পরিশোধ করার মোডাল */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              {isEn ? "Record Supplier Payment" : "সাপ্লায়ারকে টাকা পরিশোধ"}
            </h3>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="label">{isEn ? "Payment Amount (TK)" : "পরিশোধিত অর্থ (টাকা)"} *</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  defaultValue={currentDue > 0 ? currentDue : ""}
                  className="input font-bold text-gray-900"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="label">{isEn ? "Payment Method" : "পেমেন্ট মাধ্যম"} *</label>
                <select name="method" required className="input font-semibold" defaultValue="CASH">
                  <option value="CASH">{isEn ? "Cash" : "নগদ ক্যাশ"}</option>
                  <option value="BANK">{isEn ? "Bank" : "ব্যাংক একাউন্ট"}</option>
                  <option value="MOBILE">{isEn ? "Mobile Banking" : "মোবাইল ব্যাংকিং (বিকাশ/নগদ)"}</option>
                </select>
              </div>

              <div>
                <label className="label">{isEn ? "Note / Description" : "নোট / বিবরণ (ঐচ্ছিক)"}</label>
                <input
                  type="text"
                  name="note"
                  className="input"
                  placeholder={isEn ? "e.g. Paddy purchase payout" : "যেমন: ধান ক্রয়ের বকেয়া পরিশোধ"}
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
                  className="btn bg-emerald-600 text-white hover:bg-emerald-700 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 font-semibold"
                >
                  {loading && <span className="animate-ping h-2 w-2 rounded-full bg-white"></span>}
                  {isEn ? "Save Payment" : "টাকা পরিশোধ নিশ্চিত করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
