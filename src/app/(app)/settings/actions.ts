"use server";

import { runAction } from "@/lib/action-result";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";
import bcrypt from "bcryptjs";
import { USER_ROLES, roleRank } from "@/lib/constants";

export async function createUser(formData: FormData) {
  const session = await requireRole("OWNER", "MANAGER");
  const callerRole = (session.user as any).role as string;
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const monthlySalary = parseFloat(formData.get("monthlySalary") as string);

  if (!name || !email || !password) throw new Error("নাম, ইমেইল ও পাসওয়ার্ড দিন");
  if (!USER_ROLES.includes(role as any)) throw new Error("সঠিক ভূমিকা দিন");
  if (password.length < 6) throw new Error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হবে");
  // নিম্ন রোলের ইউজার উচ্চতর বা সমান রোল তৈরি করতে পারবে না (MANAGER → OWNER নিষিদ্ধ)
  if (roleRank(role) >= roleRank(callerRole)) {
    throw new Error("এই রোলে ইউজার তৈরির অনুমতি নেই");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("এই ইমেইল ইতিমধ্যে আছে");

  await prisma.user.create({
    data: {
      name,
      email,
      phone: (formData.get("phone") as string)?.trim() || null,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      monthlySalary: Number.isNaN(monthlySalary) ? null : monthlySalary,
    },
  });
  revalidatePath("/settings");
}

export async function toggleUserActive(id: string) {
  return runAction(async () => {
    const session = await requireRole("OWNER", "MANAGER");
    const callerRole = (session.user as any).role as string;
    const callerId = (session.user as any).id as string;
    if (id === callerId) throw new Error("নিজের অ্যাকাউন্ট পরিবর্তন করা যাবে না");

    const u = await prisma.user.findUniqueOrThrow({ where: { id } });
    // উচ্চতর বা সমান রোলের ইউজারকে MANAGER পরিবর্তন করতে পারবে না
    if (roleRank(u.role) >= roleRank(callerRole)) {
      throw new Error("এই ইউজার পরিবর্তনের অনুমতি নেই");
    }
    await prisma.user.update({ where: { id }, data: { active: !u.active } });
    revalidatePath("/settings");
  });
}
