import "server-only";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n";

// সার্ভার সাইডে cookie থেকে ভাষা পড়া (শুধু সার্ভার কম্পোনেন্টে ব্যবহারযোগ্য)
export async function getLang(): Promise<Locale> {
  const store = cookies();
  const v = store.get("lang")?.value;
  return v === "en" ? "en" : "bn";
}
