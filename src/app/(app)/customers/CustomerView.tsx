"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { Card } from "@/components/ui";
import { formatTaka , formatNumber } from "@/lib/utils";
import { Users, Plus, Search, Edit2, Trash2, User, Wallet } from "lucide-react";
import { deleteCustomer } from "../parties/actions";

type CustomerItem = {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  dueAmount: number;
  notes: string | null;
  totalBill?: number;
  totalPaid?: number;
};

export function CustomerView({
  initialCustomers,
}: {
  initialCustomers: CustomerItem[];
}) {
  const { lang } = useLang();
  const isEn = lang === "en";

  const [customers, setCustomers] = useState(initialCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm(isEn ? "Are you sure you want to delete this customer?" : "আপনি কি নিশ্চিতভাবে এই কাস্টমারকে মুছে ফেলতে চান?")) {
      return;
    }
    setPendingId(id);
    try {
      await deleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      alert(e.message || (isEn ? "Failed to delete customer" : "কাস্টমার মুছতে ব্যর্থ হয়েছে"));
    } finally {
      setPendingId(null);
    }
  }

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const displayCode = (c.code || `C-${c.id.slice(-4)}`).toLowerCase();

    return (
      c.name.toLowerCase().includes(q) ||
      displayCode.includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  const totalCount = customers.length;
  const totalBillSum = customers.reduce((sum, c) => sum + (c.totalBill || 0), 0);
  const totalPaidSum = customers.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
  const totalDue = customers.reduce((sum, c) => sum + c.dueAmount, 0);
  const withDueCount = customers.filter((c) => c.dueAmount > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
        <p className="min-w-0 flex-1 text-sm text-gray-500">
          {isEn ? "Customer directory and sales ledgers" : "কাস্টমার ডিরেক্টরি, আইডি কোড ও চাল বিক্রয় খতিয়ান"}
        </p>
        <Link href="/customers/new" className="btn-primary flex shrink-0 items-center gap-1.5 text-xs py-1.5 px-3">
          <Plus size={14} />
          {isEn ? "Add Customer" : "নতুন কাস্টমার"}
        </Link>
      </div>

      {/* ম্যাট্রিক কার্ডসমূহ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="card-gradient p-3.5">
          <div className="flex items-center gap-1.5">
            <Users className="text-brand-600" size={16} />
            <p className="text-xs text-gray-500">{isEn ? "Total Customers" : "মোট কাস্টমার"}</p>
          </div>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatNumber(totalCount, lang)} {isEn ? "customers" : "জন"}</p>
        </Card>

        <Card className="card-gradient p-3.5">
          <div className="flex items-center gap-1.5">
            <Wallet className="text-teal-600" size={16} />
            <p className="text-xs text-gray-500">{isEn ? "Total Purchases" : "মোট চাল ক্রয় (বিল)"}</p>
          </div>
          <p className="text-lg font-bold text-teal-800 mt-1">{formatTaka(totalBillSum, lang)}</p>
        </Card>

        <Card className="card-gradient p-3.5">
          <div className="flex items-center gap-1.5">
            <Wallet className="text-emerald-600" size={16} />
            <p className="text-xs text-gray-500">{isEn ? "Total Paid" : "মোট পরিশোধ"}</p>
          </div>
          <p className="text-lg font-bold text-emerald-700 mt-1">{formatTaka(totalPaidSum, lang)}</p>
        </Card>

        <Card className="card-gradient p-3.5">
          <div className="flex items-center gap-1.5">
            <Users className="text-amber-700" size={16} />
            <p className="text-xs text-gray-500">{isEn ? "Customers with Due" : "মোট বাকি রাখা কাস্টমার"}</p>
          </div>
          <p className="text-lg font-bold text-amber-700 mt-1">{formatNumber(withDueCount, lang)} {isEn ? "customers" : "জন"} ({formatTaka(totalDue, lang)})</p>
        </Card>
      </div>

      {/* সার্চ ফিল্টার */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
          <Search size={16} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isEn ? "Search by name, ID code, phone or address..." : "নাম, আইডি নম্বর (যেমন: C-101), মোবাইল বা ঠিকানা দিয়ে খুঁজুন..."}
          className="input pl-9"
        />
      </div>

      {/* কাস্টমার টেবিল (হুবহু সাপ্লায়ার টেবিলের মতো ৬টি কলাম) */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-xs text-gray-500">
          {isEn ? "No customers found" : "কোনো কাস্টমার পাওয়া যায়নি"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="px-4 py-3">{isEn ? "ID" : "আইডি"}</th>
                  <th className="px-4 py-3">{isEn ? "Name" : "নাম"}</th>
                  <th className="px-4 py-3">{isEn ? "Phone & Address" : "মোবাইল ও ঠিকানা"}</th>
                  <th className="px-4 py-3 text-right text-teal-800">{isEn ? "Total Purchases" : "মোট ক্রয়"}</th>
                  <th className="px-4 py-3 text-right text-emerald-700">{isEn ? "Total Paid" : "পরিশোধ"}</th>
                  <th className="px-4 py-3 text-right">{isEn ? "Status" : "স্ট্যাটাস"}</th>
                  <th className="px-4 py-3 text-center">{isEn ? "Actions" : "অ্যাকশন"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCustomers.map((c) => {
                  const isPending = pendingId === c.id;
                  const displayCode = c.code || `C-${c.id.slice(-4)}`;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 align-top">
                        <span className="font-mono text-[10px] whitespace-nowrap text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                          {displayCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top font-bold text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 font-medium text-gray-600">
                        <div>{c.phone || "—"}</div>
                        <div className="text-[10px] text-gray-400">{c.address || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-teal-800">
                        {formatTaka(c.totalBill || 0, lang)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {formatTaka(c.totalPaid || 0, lang)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.dueAmount > 0 ? (
                          <span className="inline-block font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                            {isEn ? "Due" : "বকেয়া"} {formatTaka(c.dueAmount, lang)}
                          </span>
                        ) : (
                          <span className="inline-block font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {isEn ? "Paid" : "পরিশোধিত"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-3">
                          <Link
                            href={`/customers/${c.id}`}
                            className="text-[#7c3aed] hover:text-violet-700 font-medium flex items-center gap-1"
                          >
                            <User size={12} />
                            {isEn ? "Profile" : "প্রোফাইল"}
                          </Link>
                          <Link
                            href={`/customers/${c.id}/edit`}
                            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            <Edit2 size={12} />
                            {isEn ? "Edit" : "সম্পাদনা"}
                          </Link>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 disabled:opacity-50"
                            disabled={isPending}
                          >
                            <Trash2 size={12} />
                            {isEn ? "Delete" : "মুছুন"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
