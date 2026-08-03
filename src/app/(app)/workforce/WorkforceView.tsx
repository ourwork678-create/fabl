"use client";

import { unwrap } from "@/lib/action-result";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { PageHeader, Card } from "@/components/ui";
import { formatTaka, formatNumber } from "@/lib/utils";
import { Users, Plus, Search, Edit2, Trash2, Eye, UserCheck, Briefcase, Wallet, User } from "lucide-react";
import { deleteWorkforceMember } from "./actions";
import { SalaryGenForm } from "./SalaryGenForm";
import { PaySalaryButton } from "./PaySalaryButton";
import { StaffFormModal } from "./StaffFormModal";

type Member = {
  id: string;
  name: string;
  phone: string | null;
  designation: string | null;
  rateType: string;
  rateAmount: number;
  balance: number;
  totalBill?: number;
  totalPaid?: number;
  active: boolean;
};

type StaffUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  role: string;
  monthlySalary: number;
  active: boolean;
};

type Salary = {
  id: string;
  month: string;
  amount: number;
  netAmount: number;
  status: string;
  user: { name: string } | null;
};

export function WorkforceView({
  initialMembers,
  staffUsers = [],
  initialSalaries = [],
}: {
  initialMembers: Member[];
  staffUsers?: StaffUser[];
  initialSalaries?: Salary[];
}) {
  const { lang } = useLang();
  const isEn = lang === "en";
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Filter members by search
  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q)) ||
      (m.designation && m.designation.toLowerCase().includes(q))
    );
  });

  // Calculate metrics
  const totalCount = members.length;
  const activeCount = members.filter((m) => m.active).length;
  const totalBillSum = members.reduce((acc, m) => acc + (m.totalBill || 0), 0);
  const totalPaidSum = members.reduce((acc, m) => acc + (m.totalPaid || 0), 0);
  const totalBalance = members.reduce((sum, m) => sum + m.balance, 0);

  // Delete worker handler
  async function handleDelete(id: string) {
    if (
      !confirm(
        isEn
          ? "Are you sure you want to remove this workforce member? All their logs and linked expenses will be deleted."
          : "আপনি কি নিশ্চিত যে এই কর্মীকে বাদ দিতে চান? তাঁর সকল খতিয়ান ও অ্যাকাউন্টের লিঙ্কড খরচ স্বয়ংক্রিয়ভাবে মুছে যাবে।"
      )
    )
      return;

    setPendingId(id);
    try {
      unwrap(await deleteWorkforceMember(id));
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPendingId(null);
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
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <PageHeader
          title=""
          subtitle={isEn ? "Factory workforce and labor ledger" : "ফ্যাক্টরির কর্মীবাহিনী ও মজুরি খতিয়ান"}
        />
        <Link href="/workforce/new" className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
          <Plus size={14} />
          {isEn ? "Add Member" : "নতুন কর্মী"}
        </Link>
      </div>

      {/* ম্যাট্রিক কার্ডসমূহ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="card-gradient p-3.5">
          <div className="flex items-center gap-1.5">
            <Users className="text-[#7c3aed]" size={16} />
            <p className="text-xs text-gray-500">{isEn ? "Total Members" : "মোট কর্মী"}</p>
          </div>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatNumber(totalCount, lang)} {isEn ? "members" : "জন"} ({isEn ? "Active" : "সক্রিয়"} {formatNumber(activeCount, lang)})</p>
        </Card>

        <Card className="card-gradient p-3.5">
          <div className="flex items-center gap-1.5">
            <UserCheck className="text-blue-500" size={16} />
            <p className="text-xs text-gray-500">{isEn ? "Total Earned Wages" : "মোট প্রাপ্য (বিল)"}</p>
          </div>
          <p className="text-lg font-bold text-blue-700 mt-1">{formatTaka(totalBillSum, lang)}</p>
        </Card>

        <Card className="card-gradient p-3.5">
          <div className="flex items-center gap-1.5">
            <UserCheck className="text-emerald-500" size={16} />
            <p className="text-xs text-gray-500">{isEn ? "Total Paid" : "মোট পরিশোধ"}</p>
          </div>
          <p className="text-lg font-bold text-emerald-700 mt-1">{formatTaka(totalPaidSum, lang)}</p>
        </Card>

        <Card className="card-gradient p-3.5">
          <div className="flex items-center gap-1.5">
            <Briefcase className="text-amber-500" size={16} />
            <p className="text-xs text-gray-500">{isEn ? "Net Outstanding" : "মোট নিট বকেয়া"}</p>
          </div>
          <p className={`text-lg font-bold mt-1 ${totalBalance > 0 ? "text-amber-600" : "text-gray-900"}`}>
            {formatTaka(totalBalance, lang)}
          </p>
        </Card>
      </div>

      {/* সার্চ ও ফিল্টার */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
          <Search size={16} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isEn ? "Search by name, phone or designation..." : "নাম, মোবাইল বা পদবী দিয়ে খুঁজুন..."}
          className="input pl-9"
        />
      </div>

      {/* তালিকা */}
      {filteredMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-xs text-gray-500">
          {isEn ? "No members found" : "কোনো কর্মী পাওয়া যায়নি"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="px-4 py-3">{isEn ? "Name" : "নাম"}</th>
                  <th className="px-4 py-3">{isEn ? "Designation" : "পদবী"}</th>
                  <th className="px-4 py-3">{isEn ? "Rate Type" : "ধরন"}</th>
                  <th className="px-4 py-3 text-right">{isEn ? "Rate Amount" : "রেট"}</th>
                  <th className="px-4 py-3 text-right text-blue-700">{isEn ? "Total Earned" : "মোট প্রাপ্য (বিল)"}</th>
                  <th className="px-4 py-3 text-right text-emerald-700">{isEn ? "Total Paid" : "পরিশোধ"}</th>
                  <th className="px-4 py-3 text-right">{isEn ? "Status" : "স্ট্যাটাস"}</th>
                  <th className="px-4 py-3 text-center">{isEn ? "Actions" : "অ্যাকশন"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredMembers.map((m) => {
                  const isPending = pendingId === m.id;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{m.name}</div>
                        {m.phone && <div className="text-[10px] text-gray-400 font-mono">{m.phone}</div>}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-600">{m.designation || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-100/50">
                          {getRateTypeLabel(m.rateType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatTaka(m.rateAmount, lang)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-800">
                        {formatTaka(m.totalBill || 0, lang)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {formatTaka(m.totalPaid || 0, lang)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {m.balance > 0 ? (
                          <span className="inline-block font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                            {isEn ? "Due" : "বকেয়া"} {formatTaka(m.balance, lang)}
                          </span>
                        ) : m.balance < 0 ? (
                          <span className="inline-block font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                            {isEn ? "Advance" : "অগ্রিম"} {formatTaka(Math.abs(m.balance), lang)}
                          </span>
                        ) : (
                          <span className="inline-block font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {isEn ? "Paid" : "পরিশোধিত"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-4">
                          <Link
                            href={`/workforce/${m.id}`}
                            className="text-[#7c3aed] hover:text-violet-700 font-medium flex items-center gap-1"
                          >
                            <User size={12} />
                            {isEn ? "Profile" : "প্রোফাইল"}
                          </Link>
                          <Link
                            href={`/workforce/${m.id}/edit`}
                            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            <Edit2 size={12} />
                            {isEn ? "Edit" : "সম্পাদনা"}
                          </Link>
                          <button
                            onClick={() => handleDelete(m.id)}
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

      {/* কর্মকর্তা ও স্টাফ মাসিক বেতন ব্যবস্থাপনা (মালিক ব্যতীত) */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-slate-50/20 p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-indigo-600" />
            <h3 className="font-bold text-gray-900 text-sm">
              {isEn ? "Administration & Staff Management (Excl. Owner)" : "এডমিনিস্ট্রেশন ও কর্মকর্তা বেতন (পদ সৃষ্টি, নাম ও বেতন নির্ধারণ)"}
            </h3>
          </div>
          <StaffFormModal />
        </div>

        {/* ১. কর্মকর্তা/স্টাফ তালিকা ও পদবী/বেতন এডিট */}
        <div className="space-y-2">
          <h4 className="font-semibold text-xs text-indigo-950 flex items-center justify-between">
            <span>{isEn ? "Officers & Staff List" : "মিলের কর্মকর্তা ও স্টাফদের পদবী এবং নির্ধারিত বেতন"}</span>
            <span className="text-[10px] text-gray-500 font-normal">({formatNumber(staffUsers.length, lang)} {isEn ? "Active Staff" : "জন সক্রিয় স্টাফ"})</span>
          </h4>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full min-w-[560px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                  <th className="px-4 py-2.5">{isEn ? "Name" : "কর্মকর্তার নাম"}</th>
                  <th className="px-4 py-2.5">{isEn ? "Designation" : "পদবী / পদ"}</th>
                  <th className="px-4 py-2.5">{isEn ? "System Role" : "সিস্টেমের রোল"}</th>
                  <th className="px-4 py-2.5 text-right">{isEn ? "Monthly Salary" : "নির্ধারিত বেতন"}</th>
                  <th className="px-4 py-2.5 text-center">{isEn ? "Action" : "পদবী ও বেতন এডিট"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {staffUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      {isEn ? "No staff members created yet" : "কোনো কর্মকর্তা বা স্টাফ সদস্য পাওয়া যায়নি। নতুন স্টাফ যোগ করুন।"}
                    </td>
                  </tr>
                ) : (
                  staffUsers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-bold text-gray-900">
                        {s.name}
                        {s.phone && <span className="block text-[10px] text-gray-400 font-normal">{s.phone}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded text-[11px] border border-indigo-100">
                          {s.designation ? s.designation : (s.role === "MANAGER" ? (isEn ? "Manager" : "ব্যবস্থাপক") : s.role === "ACCOUNTANT" ? (isEn ? "Accountant" : "হিসাবরক্ষক") : (isEn ? "Operator" : "অপারেটর"))}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 font-medium">
                        {s.role === "MANAGER" ? (isEn ? "Manager" : "ম্যানেজার") : s.role === "ACCOUNTANT" ? (isEn ? "Accountant" : "অ্যাকাউন্ট্যান্ট") : (isEn ? "Operator" : "অপারেটর")}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                        {formatTaka(s.monthlySalary, lang)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => setEditingStaff(s)}
                          className="btn bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-1 px-2 text-xs font-semibold rounded-lg inline-flex items-center gap-1 border border-indigo-200"
                        >
                          <Edit2 size={12} />
                          {isEn ? "Edit Info" : "পদবী ও বেতন নির্ধারণ"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ২. মাসিক বেতন শিট তৈরি ও পরিশোধ */}
        <div className="space-y-3 pt-2">
          <h4 className="font-semibold text-xs text-indigo-950">
            {isEn ? "Monthly Salary Sheet Generation & Payment" : "মাসিক বেতন শিট তৈরি ও পরিশোধ"}
          </h4>

          <SalaryGenForm />

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full min-w-[560px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                  <th className="px-4 py-2.5">{isEn ? "Month" : "মাস"}</th>
                  <th className="px-4 py-2.5">{isEn ? "Staff Name" : "কর্মকর্তা/স্টাফ"}</th>
                  <th className="px-4 py-2.5 text-right">{isEn ? "Net Amount" : "বেতন পরিমাণ"}</th>
                  <th className="px-4 py-2.5 text-center">{isEn ? "Status / Action" : "স্ট্যাটাস / পরিশোধ"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {initialSalaries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      {isEn ? "No monthly salary sheets generated yet" : "কোনো কর্মকর্তা বেতনের হিসাব জেনারেট করা হয়নি"}
                    </td>
                  </tr>
                ) : (
                  initialSalaries.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-medium">{s.month}</td>
                      <td className="px-4 py-2.5 font-semibold text-gray-900">{s.user?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{formatTaka(s.netAmount, lang)}</td>
                      <td className="px-4 py-2.5 text-center">
                        {s.status === "PAID" ? (
                          <span className="badge bg-emerald-100 text-emerald-800 font-medium">{isEn ? "Paid" : "পরিশোধিত"}</span>
                        ) : (
                          <div className="flex justify-center">
                            <PaySalaryButton id={s.id} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* এডিট মোডাল */}
      {editingStaff && (
        <StaffFormModal staff={editingStaff} onClose={() => setEditingStaff(null)} />
      )}
    </div>
  );
}
