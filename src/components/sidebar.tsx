"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Wheat, LogOut, Search } from "lucide-react";
import { navGroups, type Role } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/LangProvider";
import { LangToggle } from "@/components/LangToggle";
import { signOut } from "next-auth/react";

export function Sidebar({ role, userName }: { role: Role; userName?: string }) {
  const pathname = usePathname();
  const { t, lbl } = useLang();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = navGroups
    .map((g) => ({
      ...g,
      items: g.items
        .filter((it) => !it.roles || it.roles.includes(role))
        .filter((it) => {
          if (!searchQuery) return true;
          // search by translate key or label text
          const keyLabel = t(it.key).toLowerCase();
          return keyLabel.includes(searchQuery.toLowerCase());
        }),
    }))
    .filter((g) => g.items.length > 0);

  const content = (
    <div className="flex h-full flex-col bg-[#111322] text-slate-300">
      {/* লোগো সেকশন */}
      <div className="flex items-center gap-2 border-b border-[#1c1e30] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7c3aed] text-white shadow-lg shadow-purple-950/40">
          <Wheat size={20} />
        </div>
        <div>
          <p className="font-bold leading-tight text-white">{t("app.name")}</p>
          <p className="text-[10px] text-slate-400">{t("app.tagline")}</p>
        </div>
      </div>

      {/* সার্চ ইনপুট */}
      <div className="px-4 py-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder={t("common.search") + "..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-[#1c1e30] pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none border border-transparent focus:border-[#7c3aed]/50 focus:bg-[#1f223a] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-500 hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* নেভিগেশন লিংকসমূহ */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-slate-500">
            {t("common.noResult") || "No items found"}
          </p>
        ) : (
          filtered.map((group) => (
            <div key={group.titleKey} className="mb-4">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {t(group.titleKey)}
              </p>
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-[#7c3aed] text-white shadow-md shadow-purple-950/30"
                        : "text-slate-400 hover:bg-[#1c1e30] hover:text-white"
                    )}
                  >
                    <Icon size={16} />
                    {t(item.key)}
                  </Link>
                );
              })}
            </div>
          ))
        )}
      </nav>

      {/* ফুটার */}
      <div className="border-t border-[#1c1e30] px-3 py-3 space-y-3 bg-[#0d0f1c]">
        {/* লগআউট বাটন */}
        <div className="flex items-center px-1">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn-ghost w-full justify-start px-2 py-1.5 text-xs text-red-400 hover:bg-red-950/20 hover:text-red-300"
          >
            <LogOut size={14} />
            {t("common.logout")}
          </button>
        </div>

        {userName && (
          <div className="px-2 text-xs border-t border-[#1c1e30] pt-2">
            <p className="truncate font-medium text-slate-200">{userName}</p>
            <p className="text-[10px] text-slate-500">
              {t("common.role")}: {lbl("role", role)}
            </p>
          </div>
        )}

        {/* ডেভেলপার ইনফো */}
        <div className="px-2 pt-2 border-t border-[#1c1e30] text-[10px] text-slate-500 space-y-0.5">
          <p className="font-semibold text-slate-400">Developed By: Bunon IT Limited</p>
          <p>Mobile: 01767037151</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* মোবাইল হেডার বার */}
      <div
        className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-[#1c1e30] bg-[#111322] px-3 py-2.5 lg:hidden text-white no-print print:hidden font-bangla"
        style={{ fontFamily: "var(--font-bangla), 'Hind Siliguri', sans-serif" }}
      >
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-slate-800 bg-[#1c1e30] p-2 text-slate-300 font-bangla"
          aria-label="মেনু খুলুন"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-1.5 font-bangla">
          <Wheat size={18} className="text-[#7c3aed]" />
          <span className="font-bold text-white font-bangla">{t("app.name")}</span>
        </div>
        <div className="font-bangla">
          <LangToggle compact />
        </div>
      </div>

      {/* মোবাইল ওভারলে */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* সাইডবার */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-[#1c1e30] bg-[#111322] transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded p-1 text-slate-500 hover:text-slate-300 lg:hidden"
          aria-label="মেনু বন্ধ করুন"
        >
          <X size={20} />
        </button>
        {content}
      </aside>
    </>
  );
}
