import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { USER_ROLES } from "@/lib/constants";
import { getServerSession } from "next-auth";
import { t, lbl, type Locale } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { requireRole, roleLabel } from "@/lib/guard";
import { createUser } from "./actions";
import { ToggleActiveButton } from "./ToggleActiveButton";
import { UserPlus, Users, ShieldCheck } from "lucide-react";

export default async function SettingsPage() {
  await requireRole("OWNER", "MANAGER");
  const session = await getServerSession(authOptions);
  const lang = await getLang();
  const isEn = lang === "en";

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader title={t(lang, "set.title")} subtitle={t(lang, "set.subtitle")} />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* কলাম ১: নতুন ইউজার/স্টাফ অ্যাকাউন্ট তৈরির ফর্ম (মোবাইলে ফুল উইডথ) */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserPlus className="text-brand-600" size={18} />
              <h2 className="font-bold text-gray-900 text-sm">{t(lang, "set.newUser")}</h2>
            </div>

            <form action={createUser} className="space-y-3">
              <div>
                <label className="label">{t(lang, "set.name")} *</label>
                <input name="name" required className="input font-semibold" placeholder="ইউজারের পূর্ণ নাম" />
              </div>

              <div>
                <label className="label">{t(lang, "set.email")} *</label>
                <input name="email" type="email" required className="input font-semibold" placeholder="ইমেইল এড্রেস" />
              </div>

              <div>
                <label className="label">{t(lang, "set.password")} *</label>
                <input name="password" type="password" required minLength={6} className="input font-semibold" placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">{t(lang, "cust.phone")}</label>
                  <input name="phone" className="input font-semibold" placeholder="মোবাইল নম্বর" />
                </div>
                <div>
                  <label className="label">{t(lang, "set.salary")}</label>
                  <input name="monthlySalary" type="number" step="0.01" className="input font-semibold" placeholder="বেতন (৳)" />
                </div>
              </div>

              <div>
                <label className="label">{t(lang, "set.role")} *</label>
                <select name="role" required className="input font-semibold" defaultValue="OPERATOR">
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r, lang as Locale)}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn-primary w-full py-2.5 font-semibold mt-2">
                {t(lang, "set.submit")}
              </button>
            </form>
          </div>
        </div>

        {/* কলাম ২: ইউজার ও স্টাফ অ্যাকাউন্ট তালিকা (মোবাইলে স্ক্রোলযোগ্য ও রেসপন্সিভ) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={18} />
              <h2 className="font-bold text-gray-900 text-sm">{t(lang, "set.list")}</h2>
            </div>
            <span className="text-xs text-gray-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-full">
              মোট {users.length} জন
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="px-4 py-3">{t(lang, "set.name")}</th>
                    <th className="px-4 py-3 hidden sm:table-cell">{t(lang, "set.email")}</th>
                    <th className="px-4 py-3">{t(lang, "set.role")}</th>
                    <th className="px-4 py-3 text-right">{t(lang, "set.salaryCol")}</th>
                    <th className="px-4 py-3 text-center">{t(lang, "set.state")}</th>
                    <th className="px-4 py-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {u.name}
                          {u.id === session?.user.id && (
                            <span className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded font-mono border border-brand-100">
                              {t(lang, "set.you")}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono sm:hidden">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600 hidden sm:table-cell">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-800 border border-slate-200">
                          {roleLabel(u.role, lang as Locale)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {u.monthlySalary ? `৳${u.monthlySalary.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.active ? (
                          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">{t(lang, "set.active")}</span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-600">{t(lang, "set.inactive")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.id === session?.user.id ? null : (
                          <ToggleActiveButton id={u.id} active={u.active} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
