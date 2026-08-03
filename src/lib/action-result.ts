// সার্ভার অ্যাকশনে throw করা এররের বার্তা Next.js প্রোডাকশন বিল্ডে মুছে ফেলে
// ("An error occurred in the Server Components render...") — কারণ ভেতরের বার্তা
// ফাঁস হতে পারে। কিন্তু আমাদের বার্তাগুলো ইচ্ছাকৃত, ব্যবহারকারীকে দেখানোর জন্য
// ("খুদ এর স্টক পর্যাপ্ত নয়")। তাই throw না করে রিটার্ন ভ্যালু হিসেবে পাঠাই —
// রিটার্ন ভ্যালু Next.js অক্ষত রাখে।

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const GENERIC_ERROR = "কাজটি সম্পন্ন করা যায়নি, আবার চেষ্টা করুন";

// guard.ts-এর কারিগরি বার্তাগুলো ব্যবহারকারীর ভাষায়
const FRIENDLY: Record<string, string> = {
  UNAUTHORIZED: "সেশন শেষ হয়ে গেছে — আবার লগইন করুন",
  FORBIDDEN: "এই কাজটি করার অনুমতি আপনার নেই",
};

/**
 * সার্ভার অ্যাকশনের বডি এর ভেতরে চালান। ব্যতিক্রম ঘটলে বার্তাসহ
 * `{ ok: false }` ফেরত যায়, প্রোডাকশনেও বার্তাটা অক্ষত থাকে।
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    // redirect()/notFound() নিয়ন্ত্রণপ্রবাহের জন্য throw করে — ওগুলো গিলে ফেলা যাবে না
    const digest = (err as { digest?: unknown })?.digest;
    if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")) {
      throw err;
    }
    const raw = err instanceof Error ? err.message : "";
    console.error("[action]", err);
    return { ok: false, error: FRIENDLY[raw] || raw || GENERIC_ERROR };
  }
}

/**
 * ক্লায়েন্টে ফলাফল খোলা। ব্যর্থ হলে আসল বার্তা নিয়ে throw করে, তাই
 * কলিং কম্পোনেন্টের try/catch আগের মতোই কাজ করে।
 */
export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
