"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { MACHINE_STATUSES } from "@/lib/constants";

export async function createMachine(formData: FormData) {
  await requireUser();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("নাম দেওয়া আবশ্যক");

  // Auto-generate a unique brand/code since no brand input is present in the form
  const randSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  const code = "EQ-" + Date.now().toString().slice(-5) + randSuffix;

  const type = (formData.get("type") as string)?.trim() || "টুলস";
  const quantity = numOrNull(formData.get("quantity"));

  try {
    await prisma.machine.create({
      data: {
        name,
        code,
        type,
        capacityPerHr: quantity,
        notes: null,
      },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      throw new Error("কোড জেনারেশনে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন");
    }
    throw err;
  }
  revalidatePath("/machines");
  redirect("/machines");
}

export async function createMachinery(formData: FormData) {
  await requireUser();
  const name = (formData.get("name") as string)?.trim();
  const brand = (formData.get("brand") as string)?.trim().toUpperCase();
  if (!name || !brand) throw new Error("নাম ও ব্র্যান্ড দেওয়া আবশ্যক");

  try {
    await prisma.machine.create({
      data: {
        name,
        code: brand,
        type: "মেশিন",
        capacityPerHr: null,
        notes: null,
      },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      throw new Error("এই ব্র্যান্ড নামটি ইতিমধ্যেই অন্য কোনো মেশিন বা সরঞ্জামের জন্য ব্যবহৃত হচ্ছে");
    }
    throw err;
  }
  revalidatePath("/machines");
  redirect("/machines");
}

export async function updateMachine(id: string, formData: FormData) {
  await requireUser();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("নাম দেওয়া আবশ্যক");

  const brand = (formData.get("brand") as string)?.trim().toUpperCase();
  const hasTypeField = formData.has("type");
  const hasQuantityField = formData.has("quantity");

  const updateData: any = {
    name,
  };

  if (brand) {
    updateData.code = brand;
  }
  if (hasTypeField) {
    updateData.type = (formData.get("type") as string)?.trim() || null;
  }
  if (hasQuantityField) {
    updateData.capacityPerHr = numOrNull(formData.get("quantity"));
  }

  try {
    await prisma.machine.update({
      where: { id },
      data: updateData,
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      throw new Error("এই ব্র্যান্ড নামটি ইতিমধ্যেই অন্য কোনো সরঞ্জাম বা উপকরণের জন্য ব্যবহৃত হচ্ছে");
    }
    throw err;
  }
  revalidatePath("/machines");
  redirect("/machines");
}

export async function deleteMachine(id: string) {
  await requireUser();
  await prisma.machine.delete({ where: { id } });
  revalidatePath("/machines");
}

export async function setMachineStatus(id: string, formData: FormData) {
  await requireUser();
  const status = formData.get("status") as string;
  if (!MACHINE_STATUSES.includes(status as any)) throw new Error("সঠিক স্ট্যাটাস নয়");

  await prisma.machine.update({ where: { id }, data: { status } });
  revalidatePath("/machines");
  revalidatePath("/monitoring");
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (!v || String(v) === "") return null;
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}
