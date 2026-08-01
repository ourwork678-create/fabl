import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { MACHINE_STATUSES } from "@/lib/constants";

const hasValidKey = (req: Request) => {
  const key = process.env.MONITORING_API_KEY;
  if (!key) return false;
  return req.headers.get("x-api-key") === key;
};

// সর্বশেষ মেশিন লগ ও স্ট্যাটাস (অথেনটিকেটেড ইউজার)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const machines = await prisma.machine.findMany({
    orderBy: { name: "asc" },
  });

  const result = await Promise.all(
    machines.map(async (m) => {
      const lastLog = await prisma.machineLog.findFirst({
        where: { machineId: m.id },
        orderBy: { timestamp: "desc" },
      });
      return { ...m, lastLog };
    })
  );

  return NextResponse.json({ machines: result });
}

// সংখ্যাবাচক সেন্সর মান যাচাই (অ-সংখ্যা → null, Decimal ত্রুটি এড়াতে)
const toNumberOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// সেন্সর ডেটা পুশ (IoT ডিভাইস থেকে) — API কী বা সেশন প্রয়োজন
export async function POST(req: Request) {
  if (!hasValidKey(req)) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const {
    machineCode,
    status,
    temperature,
    vibration,
    powerKw,
    rpm,
    throughput,
  } = body || {};

  if (!machineCode) {
    return NextResponse.json({ error: "machineCode আবশ্যক" }, { status: 400 });
  }

  const machine = await prisma.machine.findUnique({ where: { code: machineCode } });
  if (!machine) {
    return NextResponse.json({ error: "মেশিন পাওয়া যায়নি" }, { status: 404 });
  }

  // শুধু বৈধ স্ট্যাটাস গ্রহণযোগ্য, নাহলে মেশিনের বর্তমান স্ট্যাটাস বজায় থাকে
  const validStatus =
    typeof status === "string" && MACHINE_STATUSES.includes(status as any)
      ? status
      : machine.status;

  const log = await prisma.machineLog.create({
    data: {
      machineId: machine.id,
      status: validStatus,
      temperature: toNumberOrNull(temperature),
      vibration: toNumberOrNull(vibration),
      powerKw: toNumberOrNull(powerKw),
      // স্কিমায় rpm Int — দশমিক এলে রাউন্ড করি, নাহলে Prisma ত্রুটি দেবে
      rpm: toNumberOrNull(rpm) === null ? null : Math.round(toNumberOrNull(rpm)!),
      throughput: toNumberOrNull(throughput),
    },
  });

  await prisma.machine.update({ where: { id: machine.id }, data: { status: validStatus } });

  return NextResponse.json({ ok: true, log });
}
