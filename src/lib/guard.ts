import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { Role } from "@/lib/nav";
import { lbl, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

// JWT স্ট্র্যাটেজিতে active স্ট্যাটাস শুধু লগইনে চেক হয়; তাই প্রতি রিকোয়েস্টে
// ডেটাবেস থেকে ইউজার এখনো active আছে কিনা যাচাই করি (নিষ্ক্রিয় ইউজার তাৎক্ষণিক বাদ)।
export async function getValidSession() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id as string | undefined;
  if (!id) return null;
  const u = await prisma.user.findUnique({ where: { id }, select: { active: true, role: true } });
  if (!u || !u.active) return null;
  // JWT-তে থাকা রোল পুরোনো হতে পারে (ডাউনগ্রেডের পর) — ডেটাবেসের সর্বশেষ রোলই কার্যকর
  (session!.user as any).role = u.role;
  return session;
}

// রোল-ভিত্তিক অ্যাক্সেস নিয়ন্ত্রণ (সার্ভার অ্যাকশনে ব্যবহারের জন্য)
export async function requireUser() {
  const session = await getValidSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireRole(...roles: Role[]) {
  const session = await requireUser();
  const role = (session.user as any).role as Role;
  if (!roles.includes(role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export function roleLabel(role: string, lang: Locale = "bn"): string {
  return lbl("role", role, lang);
}
