"use client";

import { useState } from "react";
import { Loader2, Plus, Edit2, X, UserCheck } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { createStaffUser, updateStaffUser } from "./actions";

type StaffUser = {
  id?: string;
  name: string;
  email?: string;
  phone?: string | null;
  designation?: string | null;
  role: string;
  monthlySalary?: number | null;
};

export function StaffFormModal({
  staff,
  onClose,
}: {
  staff?: StaffUser | null;
  onClose?: () => void;
}) {
  const { lang } = useLang();
  const isEn = lang === "en";

  const [open, setOpen] = useState(!!staff);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!staff?.id;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);

    const fd = new FormData(e.currentTarget);
    try {
      if (isEdit && staff?.id) {
        await updateStaffUser(staff.id, fd);
      } else {
        await createStaffUser(fd);
      }
      setOpen(false);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || (isEn ? "Failed to save staff info" : "তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে"));
    } finally {
      setPending(false);
    }
  }

  function handleClose() {
    setOpen(false);
    if (onClose) onClose();
  }

  if (!open && !staff) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
        <Plus size={14} />
        {isEn ? "Add Officer / Staff" : "নতুন কর্মকর্তা/স্টাফ যোগ করুন"}
      </button>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="text-indigo-600" size={18} />
            <h3 className="font-bold text-gray-900 text-sm">
              {isEdit
                ? isEn
                  ? "Edit Officer / Staff Info"
                  : "কর্মকর্তা/স্টাফের নাম, পদবী ও বেতন নির্ধারণ"
                : isEn
                ? "Add New Officer / Staff"
                : "নতুন কর্মকর্তা/স্টাফ যোগ করুন"}
            </h3>
          </div>
          <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {error && <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* নাম */}
          <div>
            <label className="label">{isEn ? "Staff Name" : "কর্মকর্তার নাম"}</label>
            <input
              type="text"
              name="name"
              defaultValue={staff?.name || ""}
              placeholder={isEn ? "e.g. Rahim Ahmed" : "যেমন: আব্দুর রহিম"}
              className="input font-semibold"
              required
            />
          </div>

          {/* পদবী / পদ সৃষ্টি (Designation) */}
          <div>
            <label className="label">{isEn ? "Designation / Position" : "পদবী / পদ (যেমন: ম্যানেজার, হিসাবরক্ষক, মিল ফোরম্যান)"}</label>
            <input
              type="text"
              name="designation"
              defaultValue={staff?.designation || ""}
              placeholder={isEn ? "e.g. Manager, Accountant, Mill Incharge" : "যেমন: মিল ম্যানেজার, একাউন্ট্যান্ট, ফোরম্যান"}
              className="input font-semibold"
            />
          </div>

          {/* নির্ধারিত মাসিক বেতন */}
          <div>
            <label className="label">{isEn ? "Fixed Monthly Salary (Tk)" : "নির্ধারিত মাসিক বেতন (টাকা)"}</label>
            <input
              type="number"
              step="100"
              name="monthlySalary"
              defaultValue={staff?.monthlySalary || ""}
              placeholder="0.00"
              className="input font-bold text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* ফোন */}
            <div>
              <label className="label">{isEn ? "Phone Number" : "মোবাইল নম্বর"}</label>
              <input
                type="text"
                name="phone"
                defaultValue={staff?.phone || ""}
                placeholder="01700000000"
                className="input font-mono"
              />
            </div>

            {/* রোল / পারমিশন */}
            <div>
              <label className="label">{isEn ? "Role / Level" : "সিস্টেমের পদবী"}</label>
              <select name="role" defaultValue={staff?.role || "OPERATOR"} className="input">
                <option value="MANAGER">{isEn ? "Manager" : "ব্যবস্থাপক (Manager)"}</option>
                <option value="ACCOUNTANT">{isEn ? "Accountant" : "হিসাবরক্ষক (Accountant)"}</option>
                <option value="OPERATOR">{isEn ? "Operator / Staff" : "অপারেটর / স্টাফ"}</option>
              </select>
            </div>
          </div>

          {!isEdit && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">{isEn ? "Email Address" : "ইমেইল অ্যাড্রেস"}</label>
                <input
                  type="email"
                  name="email"
                  placeholder="staff@mill.com"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">{isEn ? "Default Password" : "ডিফল্ট পাসওয়ার্ড"}</label>
                <input
                  type="text"
                  name="password"
                  defaultValue="staff123"
                  className="input font-mono text-gray-600"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={pending} className="btn-primary flex-1 py-2 font-semibold">
              {pending ? <Loader2 size={14} className="animate-spin" /> : isEdit ? (isEn ? "Update Info" : "তথ্য আপডেট করুন") : (isEn ? "Save Staff" : "স্টাফ সংরক্ষণ করুন")}
            </button>
            <button type="button" onClick={handleClose} className="btn-secondary py-2">
              {isEn ? "Cancel" : "বাতিল"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
