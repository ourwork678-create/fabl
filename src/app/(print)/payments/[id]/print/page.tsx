/* eslint-disable @next/next/no-img-element */
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatTaka, formatDate } from "@/lib/utils";
import { getLang } from "@/lib/i18n-server";
import { getValidSession } from "@/lib/guard";
import { generateQRCodeDataURL } from "@/lib/qrcode";
import { AutoPrint } from "@/components/AutoPrint";

export default async function PaymentPrintPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getValidSession();
  if (!session) redirect("/login");
  const lang = await getLang();
  const isEn = lang === "en";

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      supplier: true,
    },
  });

  if (!payment) notFound();

  const partyName = payment.customer?.name || payment.supplier?.name || "—";
  const partyPhone = payment.customer?.phone || payment.supplier?.phone || "—";
  const partyAddress = payment.customer?.address || payment.supplier?.address || "—";
  const partyCode = payment.customer?.code || payment.supplier?.code || "—";

  const isPaid = payment.direction === "PAID";
  const titleText = isPaid ? "টাকা পরিশোধ ভাউচার রসিদ" : "টাকা জমা গ্রহণ ভাউচার রসিদ";
  const refCode = payment.refNo || `VOU-${payment.id.slice(-6).toUpperCase()}`;

  const host = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const qrDataUrl = `${host}/verify?q=${encodeURIComponent(refCode)}`;
  const qrCodeDataUrl = await generateQRCodeDataURL(qrDataUrl);

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-black print:p-0 min-h-screen">
      <AutoPrint />

      {/* হেডার */}
      <div className="border-b-2 border-gray-800 pb-4 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wide">নিশাত অটো রাইস মিল</h1>
        <p className="text-xs text-gray-600">রাইস মিল ব্যাকরণ ও ক্যাশ মেমো ভাউচার</p>
        <div className="mt-2 inline-block rounded-full border border-gray-400 bg-gray-50 px-4 py-1 text-xs font-bold">
          {titleText}
        </div>
      </div>

      {/* মেমো, তারিখ ও QR কোড */}
      <div className="my-5 flex items-center justify-between border-b pb-4 border-gray-200 text-xs">
        <div className="space-y-1">
          <p className="text-gray-500 font-medium">{isEn ? "Voucher Ref No" : "ভাউচার মেমো নং"}:</p>
          <p className="font-mono text-base font-bold text-gray-900">{refCode}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-gray-500 font-medium">{isEn ? "Date" : "তারিখ"}:</p>
            <p className="font-bold text-gray-900">{formatDate(payment.date, lang)}</p>
          </div>

          <div className="flex flex-col items-center">
            {qrCodeDataUrl && (
              <img
                src={qrCodeDataUrl}
                alt="Receipt QR Code"
                className="h-20 w-20 rounded border border-gray-300 p-1"
              />
            )}
            <span className="text-[9px] text-gray-500 font-mono mt-0.5">যাচাই QR কোড</span>
          </div>
        </div>
      </div>

      {/* কাস্টমার/সাপ্লায়ার বিস্তারিত */}
      <div className="mb-6 rounded-lg bg-gray-50 p-4 border border-gray-200 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">{payment.partyType === "SUPPLIER" ? "সাপ্লায়ারের নাম:" : "কাস্টমারের নাম:"}</span>
          <span className="font-bold text-gray-900">{partyName} {partyCode !== "—" ? `(${partyCode})` : ""}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">মোবাইল নম্বর:</span>
          <span className="font-mono font-bold text-gray-900">{partyPhone}</span>
        </div>
        {partyAddress !== "—" && (
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">ঠিকানা:</span>
            <span>{partyAddress}</span>
          </div>
        )}
      </div>

      {/* পেমেন্ট বিবরণী টেবিল */}
      <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-6">
        <thead>
          <tr className="bg-gray-100 font-bold border-b border-gray-300">
            <th className="p-3 border-r">বিবরণ (Description)</th>
            <th className="p-3 border-r text-center">পেমেন্ট মাধ্যম</th>
            <th className="p-3 text-right">পরিমাণ (Amount)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-3 border-r font-medium">
              {payment.note || (isPaid ? "সাপ্লায়ারকে ক্যাশ/ব্যাংক মারফত টাকা পরিশোধ" : "কাস্টমার থেকে নগদ টাকা গ্রহণ")}
            </td>
            <td className="p-3 border-r text-center font-semibold">
              {payment.method === "CASH" ? "নগদ ক্যাশ" : payment.method === "BANK" ? "ব্যাংক একাউন্ট" : "মোবাইল ব্যাংকিং"}
            </td>
            <td className="p-3 text-right font-bold text-base text-gray-900">
              {formatTaka(payment.amount, lang)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ফুটস্বাক্ষর */}
      <div className="mt-16 border-t border-gray-300 pt-4 flex justify-between text-xs text-gray-600">
        <div className="text-center w-32 border-t border-gray-400 pt-1 font-semibold">গ্রহীতার স্বাক্ষর</div>
        <div className="text-center w-36 border-t border-gray-400 pt-1 font-semibold text-gray-900">মালিক / ক্যাশিয়ার</div>
      </div>
    </div>
  );
}
