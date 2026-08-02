"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wheat, Loader2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { LangToggle } from "@/components/LangToggle";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const { t, lang } = useLang();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(t("login.error"));
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }


  return (
    <div className={`${lang === "en" ? "font-gsans" : "font-bangla"} relative min-h-screen`}>
      {/* ব্যাকগ্রাউন্ড: ধানক্ষেতের ছবি (না থাকলে গ্রাডিয়েন্ট ফলব্যাক) */}
      <div
        className="fixed inset-0 -z-20 scale-110 bg-gradient-to-br from-emerald-800 via-emerald-700 to-lime-700 bg-cover bg-center blur-[6px]"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />
      <div className="fixed inset-0 -z-10 bg-slate-950/20" />

      <div className="absolute right-4 top-4 z-20">
        <LangToggle />
      </div>

      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-[1000px] gap-4 rounded-[25px] bg-white p-3 shadow-2xl shadow-black/30 lg:min-h-[620px] lg:grid-cols-2">
          {/* বাঁ পাশ: ছবির ভেতরে বসানো প্যানেল */}
          <div
            className="relative flex min-h-[240px] flex-col overflow-hidden rounded-[18px] bg-emerald-800 bg-cover bg-center p-7 sm:p-8"
            style={{ backgroundImage: "url('/login-bg.png')" }}
          >
            {/* নিচের অংশে ব্লার + স্করিম, উপরের টেক্সট পড়ার জন্য */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-1/3 backdrop-blur-lg" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-950/40 to-emerald-950/60" />

            <div className="relative flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/30 backdrop-blur">
                <Wheat size={20} />
              </div>
              <span className="font-system text-base font-semibold tracking-tight text-white">
                {t("app.name")}
              </span>
            </div>

            <div className="relative mt-16 sm:mt-20">
              <h1 className="text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl">
                {t("login.headline")}
              </h1>
              <p className="mt-10 max-w-sm text-sm leading-relaxed text-white/80">
                {t("login.tagline")}
              </p>
            </div>
          </div>

          {/* ডান পাশ: লগইন ফর্ম */}
          <div className="flex flex-col justify-center px-2 py-6 sm:px-6 lg:px-8">
            <div className="mb-7">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                {t("login.welcome")}
              </h2>
              <p className="mt-1.5 text-sm text-gray-500">{t("login.welcomeSub")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("login.email")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("login.password")}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-200/60 transition hover:bg-brand-700 disabled:opacity-70"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {t("login.submit")}
              </button>

              <p className="pt-1 text-center text-xs text-gray-400">
                {t("login.firstTime")}
              </p>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/60">
          Developed by <span className="font-medium text-white/80">Bunon It</span>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm text-white/70">
          লোড হচ্ছে...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
