/* eslint-disable @next/next/no-img-element */
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatTaka, formatDate } from "@/lib/utils";
import { getLang } from "@/lib/i18n-server";
import { getValidSession } from "@/lib/guard";
import { generateQRCodeDataURL } from "@/lib/qrcode";
import { AutoPrint } from "@/components/AutoPrint";

export default async function WorkforceTransactionPrintPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getValidSession();
  if (!session) redirect("/login");
  const lang = await getLang();
  const isEn = lang === "en";

  const txn = await prisma.workforceTransaction.findUnique({
    where: { id: params.id },
    include: { workforceMember: true },
  });

  if (!txn) notFound();

  const isBill = txn.type === "BILL";
  const titleText = isBill ? "কর্মী কাজ/বিল ভাউচার" : "কর্মী মজুরি পরিশোধ ভাউচার";
  const memoCode = `WRK-${txn.id.slice(-6).toUpperCase()}`;

  const host = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const qrUrl = `${host}/verify?q=${encodeURIComponent(memoCode)}`;
  const qrCodeDataUrl = await generateQRCodeDataURL(qrUrl);

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-black print:p-0 min-h-screen">
      <AutoPrint />

      {/* হেডার */}
      <div className="border-b-2 border-gray-800 pb-4 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wide">নিশাত অটো রাইস মিল</h1>
        <p className="text-xs text-gray-600">কর্মীবাহিনী মজুরি ও লেবার বিল ভাউচার</p>
        <div className="mt-2 inline-block rounded-full border border-gray-400 bg-gray-50 px-4 py-1 text-xs font-bold">
          {titleText}
        </div>
      </div>

      {/* মেমো মেটা ও QR কোড */}
      <div className="my-5 flex items-center justify-between border-b pb-4 border-gray-200 text-xs">
        <div className="space-y-1">
          <p className="text-gray-500 font-medium">{isEn ? "Voucher Memo No" : "ভাউচার মেমো নং"}:</p>
          <p className="font-mono text-base font-bold text-gray-900">{memoCode}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-gray-500 font-medium">{isEn ? "Date" : "তারিখ"}:</p>
            <p className="font-bold text-gray-900">{formatDate(txn.date, lang)}</p>
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

      {/* কর্মী বিবরণী */}
      <div className="mb-6 rounded-lg bg-gray-50 p-4 border border-gray-200 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">কর্মীর নাম:</span>
          <span className="font-bold text-gray-900">{txn.workforceMember.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">পদবী / কাজের ধরণ:</span>
          <span>{txn.workforceMember.designation || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">মোবাইল নম্বর:</span>
          <span className="font-mono font-bold text-gray-900">{txn.workforceMember.phone || "—"}</span>
        </div>
      </div>

      {/* লেনদেন বিবরণী টেবিল */}
      <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-6">
        <thead>
          <tr className="bg-gray-100 font-bold border-b border-gray-300">
            <th className="p-3 border-r">বিবরণ (Description)</th>
            <th className="p-3 border-r text-center">লেনদেনের প্রকার</th>
            <th className="p-3 border-r text-center">পেমেন্ট মাধ্যম</th>
            <th className="p-3 text-right">পরিমাণ (Amount)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-3 border-r font-medium">
              {txn.description || (isBill ? "কারখানা লেবার ও ড্রাইং বিল এন্ট্রি" : "কর্মী মজুরি ও পাওনা ক্যাশ পরিশোধ")}
            </td>
            <td className="p-3 border-r text-center font-bold">
              {isBill ? "কাজ / বিল (+)" : "মজুরি পরিশোধ (-)"}
            </td>
            <td className="p-3 border-r text-center font-semibold">
              {txn.paymentMethod ? (txn.paymentMethod === "CASH" ? "নগদ" : txn.paymentMethod === "BANK" ? "ব্যাংক" : "মোবাইল") : "—"}
            </td>
            <td className="p-3 text-right font-bold text-base text-gray-900">
              {formatTaka(Number(txn.amount), lang)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* স্বাক্ষর */}
      <div className="mt-16 border-t border-gray-300 pt-4 flex justify-between text-xs text-gray-600">
        <div className="text-center w-32 border-t border-gray-400 pt-1 font-semibold">কর্মীর স্বাক্ষর</div>
        <div className="text-center w-36 border-t border-gray-400 pt-1 font-semibold text-gray-900">মালিক / ক্যাশিয়ার</div>
      </div>
    </div>
  );
}
