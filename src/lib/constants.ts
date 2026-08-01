// স্ট্যাটাস/ক্যাটাগরি কনস্ট্যান্ট — enum এর পরিবর্তে (SQLite সাপোর্ট করে না)
// লেবেল (বাংলা/ইংরেজি) src/lib/i18n.ts এর labelMaps ও lbl() ফাংশনে আছে।

export const USER_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT", "OPERATOR"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// রোল অনুসারে সিনিয়রিটি (OWNER সর্বোচ্চ) — অনুমতি যাচাইয়ে ব্যবহৃত
export function roleRank(role: string): number {
  return { OWNER: 4, MANAGER: 3, ACCOUNTANT: 2, OPERATOR: 1 }[role] ?? 0;
}

export const ITEM_TYPES = ["PADDY", "RICE", "BYPRODUCT"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const TXN_STATUSES = ["PENDING", "PAID", "PARTIAL", "CANCELLED"] as const;
export type TxnStatus = (typeof TXN_STATUSES)[number];

export const MACHINE_STATUSES = ["RUNNING", "IDLE", "MAINTENANCE", "OFFLINE"] as const;
export type MachineStatus = (typeof MACHINE_STATUSES)[number];

export const PRODUCTION_STATUSES = ["RUNNING", "COMPLETED", "CANCELLED"] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

// খরচের ক্যাটাগরি — ডেটাবেসে বাংলাতেই সংরক্ষিত হয় (মাইগ্রেশন এড়াতে)
export const EXPENSE_CATEGORIES = [
  "বিদ্যুৎ",
  "শ্রম",
  "পরিবহন",
  "মেরামত",
  "কাঁচামাল",
  "অন্যান্য",
] as const;

// ইউটিলিটি/বিল ক্যাটাগরি (utilities পেজ থেকে তৈরি হয়)
export const UTILITY_CATEGORIES = [
  "বিদ্যুৎ",
  "জ্বালানি",
  "পানি",
  "ইন্টারনেট",
  "অন্যান্য বিল",
] as const;

export const PAYMENT_METHODS = ["CASH", "BANK", "MOBILE"] as const;
