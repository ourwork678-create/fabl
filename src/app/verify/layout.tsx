import { getValidSession } from "@/lib/guard";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import type { Role } from "@/lib/nav";
import Link from "next/link";
import { ShieldCheck, LogIn } from "lucide-react";

export default async function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getValidSession();

  // যদি ইউজার লগইন অবস্থায় থাকেন, তবে সাইডবার ও টপবার সহ মেইন অ্যাপ লেআউট দেখাবে
  if (session) {
    const role = (session.user?.role ?? "OPERATOR") as Role;
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role={role} userName={session.user?.name ?? undefined} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-[17px] pb-20 pt-[114px] sm:px-6 lg:px-6 lg:pt-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // পাবলিক ইউজারের (পাবলিক QR স্ক্যান) ক্ষেত্রে সুবিন্যস্ত হেডার সহ পাবলিক লেআউট
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={28} className="text-purple-400" />
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight">নিশাত অটো রাইস মিল</h1>
              <p className="text-xs text-slate-400">অনলাইন রসিদ সত্যতা যাচাই পোর্টাল</p>
            </div>
          </div>
          <Link
            href="/login"
            className="btn bg-purple-600 hover:bg-purple-700 text-white text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition"
          >
            <LogIn size={14} /> অ্যাপে লগইন
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
