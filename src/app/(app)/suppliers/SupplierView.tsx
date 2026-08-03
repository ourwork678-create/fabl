"use client";

import { unwrap } from "@/lib/action-result";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { Card } from "@/components/ui";
import { formatTaka , formatNumber } from "@/lib/utils";
import { Users, Plus, Search, Edit2, Trash2, User, Wallet } from "lucide-react";
import { deleteSupplier } from "../parties/actions";
import { PaymentForm } from "../parties/PaymentForm";

type SupplierItem = {
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

export function SupplierView({
  initialSuppliers,
}: {
  initialSuppliers: SupplierItem[];
}) {
  const { lang } = useLang();
  const isEn = lang === "en";

  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm(isEn ? "Are you sure you want to delete this supplier?" : "আপনি কি নিশ্চিতভাবে এই সাপ্লায়ারকে মুছে ফেলতে চান?")) {
      return;
    }
    setPendingId(id);
    try {
      unwrap(await deleteSupplier(id));
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) {
      alert(e.message || (isEn ? "Failed to delete supplier" : "সাপ্লায়ার মুছতে ব্যর্থ হয়েছে"));
    } finally {
      setPendingId(null);
    }
  }

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const displayCode = (s.code || `S-${s.id.slice(-4)}`).toLowerCase();

    return (
      s.name.toLowerCase().includes(q) ||
      displayCode.includes(q) ||
      s.id.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q))
    );
  });

  const totalCount = suppliers.length;
  const totalBillSum = suppliers.reduce((sum, s) => sum + (s.totalBill || 0), 0);
  const totalPaidSum = suppliers.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
  const totalDue = suppliers.reduce((sum, s) => sum + s.dueAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
        <p className="min-w-0 flex-1 text-sm text-gray-500">
          {isEn ? "Supplier directory and paddy supply ledgers" : "সাপ্লায়ার ডিরেক্টরি, আইডি কোড ও ধানের পাওনা খতিয়ান"}
        </p>
        <Link href="/suppliers/new" className="btn-primary flex shrink-0 items-center gap-1.5 text-xs py-1.5 px-3">
          <Plus size={14} />
          {isEn ? "Add Supplier" : "নতুন সাপ্লায়ার"}
        </Link>
      </div>

      {/* ম্যাট্রিক কার্ডসমূহ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="card-gradient p-3.5">
          <div className="flex items-center gap-1.5">
            <Users className="text-[#7c3aed]" size={16} />
            <p className="text-xs text-gray-500">{isEn ? "Total Suppliers" : "মোট সাপ্লায়ার"}</p>
          </div>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatNumber(totalCount, lang)} {isEn ? "suppliers" : "জন"}</p>
        </Card>

        <Card className="card-gradient p-3.5">
          <div className="flex items-center gap-1.5">
            <Wallet className="text-amber-600" size={16} />
            <p className="text-xs text-gray-500">{isEn ? "Total Paddy Supplied" : "মোট প্রাপ্ত ধান (বিল)"}</p>
          </div>
          <p className="text-lg font-bold text-amber-800 mt-1">{formatTaka(totalBillSum, lang)}</p>
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
            <Wallet className="text-red-500" size={16} />
            <p className="text-xs text-gray-500">{isEn ? "Net Payable Due" : "মোট নিট বকেয়া"}</p>
          </div>
          <p className="text-lg font-bold text-red-600 mt-1">{formatTaka(totalDue, lang)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {isEn ? "Payable to suppliers" : "মিলের কাছে সাপ্লায়াররা পাবে"}
          </p>
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
          placeholder={isEn ? "Search by name, ID code, phone or address..." : "নাম, আইডি নম্বর (যেমন: S-101), মোবাইল বা ঠিকানা দিয়ে খুঁজুন..."}
          className="input pl-9"
        />
      </div>

      {/* সাপ্লায়ার টেবিল */}
      {filteredSuppliers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-xs text-gray-500">
          {isEn ? "No suppliers found" : "কোনো সাপ্লায়ার পাওয়া যায়নি"}
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
                  <th className="px-4 py-3 text-right text-amber-800">{isEn ? "Total Supplied" : "মোট ধান সরবরাহ (বিল)"}</th>
                  <th className="px-4 py-3 text-right text-emerald-700">{isEn ? "Total Paid" : "পরিশোধ"}</th>
                  <th className="px-4 py-3 text-right">{isEn ? "Status" : "স্ট্যাটাস"}</th>
                  <th className="px-4 py-3 text-center">{isEn ? "Actions" : "অ্যাকশন"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSuppliers.map((s) => {
                  const isPending = pendingId === s.id;
                  const displayCode = s.code || `S-${s.id.slice(-4)}`;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 align-top">
                        <span className="font-mono text-[10px] whitespace-nowrap text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                          {displayCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top font-bold text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 font-medium text-gray-600">
                        <div>{s.phone || "—"}</div>
                        <div className="text-[10px] text-gray-400">{s.address || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-amber-800">
                        {formatTaka(s.totalBill || 0, lang)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {formatTaka(s.totalPaid || 0, lang)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.dueAmount > 0 ? (
                          <span className="inline-block font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200/80">
                            {isEn ? "Due" : "বকেয়া"} {formatTaka(s.dueAmount, lang)}
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
                            href={`/suppliers/${s.id}`}
                            className="text-[#7c3aed] hover:text-violet-700 font-medium flex items-center gap-1"
                          >
                            <User size={12} />
                            {isEn ? "Profile" : "প্রোফাইল"}
                          </Link>
                          <Link
                            href={`/suppliers/${s.id}/edit`}
                            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            <Edit2 size={12} />
                            {isEn ? "Edit" : "সম্পাদনা"}
                          </Link>
                          <button
                            onClick={() => handleDelete(s.id)}
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
