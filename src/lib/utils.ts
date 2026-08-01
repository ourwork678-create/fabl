import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// টাকার পরিমাণ ২ দশমিকে রাউন্ড (float প্রিসিশন ক্ষতি এড়াতে)
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// আজকের তারিখ লোকাল সময়ে "yyyy-mm-dd" (UTC অফসেট এড়াতে ফর্ম default-এর জন্য)
export function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// সংখ্যা ফরম্যাট (৳ চিহ্ন সহ)
export function formatTaka(amount: number | string | { toString(): string }, lang: string = "bn"): string {
  const n = Number(amount);
  const isEn = lang === "en";
  if (Number.isNaN(n)) return isEn ? "৳ 0" : "৳ ০";
  return "৳ " + new Intl.NumberFormat(isEn ? "en-US" : "bn-BD", {
    maximumFractionDigits: 2,
  }).format(n);
}

// সাধারণ সংখ্যা ফরম্যাট
export function formatNumber(n: number | string | { toString(): string }, lang: string = "bn"): string {
  const num = Number(n);
  const isEn = lang === "en";
  if (Number.isNaN(num)) return isEn ? "0" : "০";
  return new Intl.NumberFormat(isEn ? "en-US" : "bn-BD", { maximumFractionDigits: 3 }).format(num);
}

// তারিখ ফরম্যাট
export function formatDate(date: Date | string, lang: string = "bn"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const isEn = lang === "en";
  return new Intl.DateTimeFormat(isEn ? "en-US" : "bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string, lang: string = "bn"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const isEn = lang === "en";
  return new Intl.DateTimeFormat(isEn ? "en-US" : "bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

// "yyyy-mm-dd" স্ট্রিং লোকাল সময়ে পার্স — new Date("yyyy-mm-dd") UTC মধ্যরাত ধরে,
// ফলে UTC-এর পশ্চিমের টাইমজোনে তারিখ এক দিন পিছিয়ে দেখাত। ফাঁকা/অবৈধ হলে এখনকার সময়।
export function parseDateLocal(dateStr?: string | null): Date {
  if (dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (y && m) return new Date(y, m - 1, d || 1);
  }
  return new Date();
}

// স্মার্ট ও প্রফেশনাল মেমো নম্বর তৈরি (যেমন: SAL-2607-8492)
// dateStr "yyyy-mm-dd" লোকাল সময়ে পার্স করি (UTC অফসেট এড়াতে)
export function genReceiptNo(prefix: string, dateStrOrDate?: Date | string): string {
  let d: Date;
  if (dateStrOrDate instanceof Date) {
    d = dateStrOrDate;
  } else if (typeof dateStrOrDate === "string" && dateStrOrDate) {
    const [y, m, day] = dateStrOrDate.split("-").map(Number);
    d = y && m ? new Date(y, m - 1, day || 1) : new Date();
  } else {
    d = new Date();
  }
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yy}${mm}-${rand}`;
}

// রসিদ নম্বর সংঘর্ষে (P2002) নতুন নম্বর দিয়ে পুনরায় চেষ্টা
export async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (e?.code === "P2002" && i < attempts - 1) continue;
      throw e;
    }
  }
  throw lastErr;
}
