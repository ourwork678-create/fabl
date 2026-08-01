import Link from "next/link";
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTaka, formatNumber } from "@/lib/utils";
import { getLang } from "@/lib/i18n-server";

export default async function PublicVerifyPage({
  params,
}: {
  params: { type: string; id: string };
}) {
  const lang = await getLang();
  const isSale = params.type === "sales" || params.type === "sale";
  const isPurchase = params.type === "purchases" || params.type === "purchase";

  let saleRecord = null;
  let purchaseRecord = null;

  if (isSale) {
    saleRecord = await prisma.sale.findFirst({
      where: {
        OR: [{ id: params.id }, { receiptNo: params.id }],
      },
      include: {
        customer: true,
        items: { include: { item: true } },
      },
    });
  } else if (isPurchase) {
    purchaseRecord = await prisma.purchase.findFirst({
      where: {
        OR: [{ id: params.id }, { receiptNo: params.id }],
      },
      include: {
        supplier: true,
        items: { include: { item: true } },
      },
    });
  }

  const record = saleRecord || purchaseRecord;
  const isFound = Boolean(record);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 font-invoice">
      <div className="mx-auto max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* টপ ব্যাকগ্রাউন্ড ও ব্র্যান্ড হেডার */}
        <div className="bg-slate-900 text-white p-6 text-center">
          <div className="flex justify-center items-center gap-2 mb-1">
            <ShieldCheck size={28} className="text-emerald-400" />
            <h1 className="text-2xl font-bold">নিশাত অটো রাইস মিল</h1>
          </div>
          <p className="text-xs text-slate-300">অফিসিয়াল অনলাইন রসিদ সত্যতা যাচাইকরণ সিস্টেম</p>
          <p className="text-[11px] text-slate-400 mt-1">হাবু তাঁতীপাড়া, গজঘণ্টা, রংপুর। মোবাইলঃ 01700000000</p>
        </div>

        {isFound && record ? (
          <div className="p-6 sm:p-8 space-y-6">
            {/* সবুজ ভেরিফায়েড ব্যাজ */}
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl">
              <CheckCircle2 size={32} className="text-emerald-600 shrink-0" />
              <div>
                <h2 className="font-bold text-base text-emerald-950">✓ ডাটাবেসে নিবন্ধিত প্রামাণ্য হিসাব</h2>
                <p className="text-xs text-emerald-700 mt-0.5">
                  এই রসিদটি নিশাত অটো রাইস মিলের মূল ডাটাবেসে নিবন্ধিত এবং ১০০% সত্যতা যাচাইকৃত।
                </p>
              </div>
            </div>

            {/* রসিদের প্রাথমিক তথ্য */}
            <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">রসিদ নম্বর</p>
                <p className="font-mono font-bold text-slate-900">{record.receiptNo}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">লেনদেনের তারিখ</p>
                <p className="font-medium text-slate-900">{formatDate(record.date, lang)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{saleRecord ? "ক্রেতার নাম" : "সাপ্লায়ারের নাম"}</p>
                <p className="font-bold text-slate-900">
                  {saleRecord ? saleRecord.customer.name : purchaseRecord?.supplier.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">মোবাইল নম্বর</p>
                <p className="font-medium text-slate-900">
                  {(saleRecord ? saleRecord.customer.phone : purchaseRecord?.supplier.phone) || "—"}
                </p>
              </div>
            </div>

            {/* পণ্য বিবরণী তালিকা */}
            <div>
              <h3 className="font-bold text-sm text-slate-900 mb-3 border-b pb-1">পণ্যের বিবরণী</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 font-semibold text-slate-700 border-b">
                      <th className="py-2 px-3">ক্রমিক</th>
                      <th className="py-2 px-3">পণ্য</th>
                      <th className="py-2 px-3 text-right">পরিমাণ</th>
                      <th className="py-2 px-3 text-right">দর</th>
                      <th className="py-2 px-3 text-right">মোট টাকা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {record.items.map((line: any, idx: number) => (
                      <tr key={line.id}>
                        <td className="py-2.5 px-3 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{line.item.name}</td>
                        <td className="py-2.5 px-3 text-right">
                          {formatNumber(line.quantity, lang)} {line.item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right">{formatTaka(line.rate, lang)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                          {formatTaka(line.amount, lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* হিসাবের সামারি */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>উপমোট (Subtotal):</span>
                <span>{formatTaka(record.subtotal, lang)}</span>
              </div>
              {Number(record.discount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>ছাড় (Discount):</span>
                  <span>−{formatTaka(record.discount, lang)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 border-t pt-2">
                <span>সর্বমোট (Grand Total):</span>
                <span>{formatTaka(record.totalAmount, lang)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>পরিশোধিত (Paid Amount):</span>
                <span>{formatTaka(record.paidAmount, lang)}</span>
              </div>
              <div className="flex justify-between text-red-600 font-bold border-t pt-1">
                <span>বকেয়া (Due Amount):</span>
                <span>{formatTaka(record.dueAmount, lang)}</span>
              </div>
            </div>

            <div className="text-center pt-4 border-t text-[11px] text-slate-400">
              যাচাইকৃত আইডি: <span className="font-mono font-medium">{record.id}</span>
            </div>
          </div>
        ) : (
          /* লাল ভুয়া রসিদ ওয়ার্নিং */
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
              <AlertTriangle size={36} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-700">⚠️ অসংগতি ধরা পড়েছে / ভুয়া রসিদ</h2>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                আইডি বা রসিদ নম্বর <span className="font-mono font-bold text-slate-900">&quot;{params.id}&quot;</span> দিয়ে নিশাত অটো রাইস মিলের অফিশিয়াল ডাটাবেসে কোনো বৈধ লেনদেন পাওয়া যায়নি।
              </p>
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs mt-4 text-left">
                <p className="font-bold">কারণসমূহ হতে পারে:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-red-700">
                  <li>রসিদটি নকল বা ভুয়াভাবে তৈরি করা হয়েছে।</li>
                  <li>রসিদ নম্বর ভুলভাবে টাইপ করা হয়েছে।</li>
                  <li>লেনদেনটি সিস্টেম থেকে মুছে ফেলা হয়েছে।</li>
                </ul>
              </div>
            </div>

            <div className="pt-4">
              <Link href="/verify" className="btn-primary inline-flex items-center gap-2">
                <ArrowLeft size={16} /> পুনরায় অন্য রসিদ নম্বর সার্চ করুন
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
