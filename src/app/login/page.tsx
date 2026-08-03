"use client";

import { useState, useEffect, useRef, Suspense } from "react";
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

  // "জানালা" লেয়ারটা পেজের মূল ব্যাকগ্রাউন্ডের সাথে মিলিয়ে বসানো।
  // background-attachment: fixed দিয়ে এটা এক লাইনে হতো, কিন্তু iOS Safari
  // ওটা সাপোর্ট করে না — আর blur ফিল্টার থাকলে যেকোনো ব্রাউজারেই ভেঙে যায়।
  // তাই viewport-এর cover সাইজ/পজিশন নিজে হিসাব করে বসাচ্ছি।
  const glassRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = glassRef.current;
    if (!node) return;

    let natural: { w: number; h: number } | null = null;

    function place() {
      const el = glassRef.current;
      if (!el || !natural) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.max(vw / natural.w, vh / natural.h);
      const bw = natural.w * scale;
      const bh = natural.h * scale;
      const rect = el.getBoundingClientRect();
      el.style.backgroundSize = `${bw}px ${bh}px`;
      el.style.backgroundPosition = `${(vw - bw) / 2 - rect.left}px ${
        (vh - bh) / 2 - rect.top
      }px`;
    }

    const img = new window.Image();
    img.onload = () => {
      natural = { w: img.naturalWidth, h: img.naturalHeight };
      place();
    };
    img.src = "/login-bg.png";

    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    const ro = new ResizeObserver(place);
    ro.observe(node);

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
      ro.disconnect();
    };
  }, []);

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
      {/* ব্যাকগ্রাউন্ড: ধানক্ষেতের ছবি (না থাকলে গ্রাডিয়েন্ট ফলব্যাক)।
          দুই স্তর — নিচেরটা শার্প, উপরেরটা ঝাপসা। দুটোই ঠিক viewport-সাইজ
          (scale নেই), যাতে জানালার bg-fixed ফ্রেমিংয়ের সাথে হুবহু মেলে;
          blur-এর কিনারার ফিকে অংশটুকু নিচের শার্প কপি ঢেকে দেয়। */}
      <div
        className="fixed inset-0 -z-30 bg-gradient-to-br from-emerald-800 via-emerald-700 to-lime-700 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center blur-[6px]"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />
      <div className="fixed inset-0 -z-10 bg-slate-950/20" />

      <div className="absolute right-4 top-4 z-20">
        <LangToggle />
      </div>

      <div className="flex min-h-screen flex-col items-center justify-center px-[23px] pb-10 pt-20 sm:px-4 sm:py-10">
        <div className="grid w-full max-w-[1000px] gap-4 rounded-[25px] bg-white p-3 shadow-2xl shadow-black/30 lg:min-h-[620px] lg:grid-cols-2">
          {/* বাঁ পাশ: ছবির ভেতরে বসানো প্যানেল */}
          <div className="relative flex min-h-[240px] flex-col overflow-hidden rounded-[18px] bg-emerald-950 p-7 sm:p-8">
            {/* খোলা জানালা: এখানে পেজের মূল ব্যাকগ্রাউন্ডই দেখা যায়।
                প্যানেলের চেয়ে ৮০px বড় করে রাখা, যাতে blur(40px)-এর ফিকে
                কিনারা কাটা অংশের বাইরে পড়ে। পজিশন বসায় উপরের useEffect। */}
            <div
              ref={glassRef}
              className="pointer-events-none absolute -inset-[80px] bg-emerald-800 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/login-bg.png')",
                filter: "blur(40px)",
              }}
            />
            {/* মাঝ থেকে ছড়ানো আলো */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_35%,rgba(163,230,53,0.22),transparent_68%)]" />
            {/* কাচের খাঁজের হাইলাইট — মোবাইলে খাঁজের দূরত্ব ৩০% কম */}
            <div
              className="pointer-events-none absolute inset-0 [--flute:0.7] sm:[--flute:1]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.01) calc(5px * var(--flute, 1)), rgba(0,0,0,0.09) calc(11px * var(--flute, 1)), rgba(0,0,0,0.02) calc(16px * var(--flute, 1)), rgba(255,255,255,0.07) calc(22px * var(--flute, 1)))",
              }}
            />
            {/* টেক্সট পড়ার জন্য স্করিম */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/20 to-emerald-950/45" />

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
                className="!mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70"
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
