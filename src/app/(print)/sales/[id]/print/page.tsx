/* eslint-disable @next/next/no-img-element */
import { notFound, redirect } from "next/navigation";
import { getValidSession } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTaka, formatNumber } from "@/lib/utils";
import { generateQRCodeDataURL } from "@/lib/qrcode";
import { AutoPrint } from "@/components/AutoPrint";
import { PrintToolbar } from "@/components/PrintToolbar";

export default async function SalePrintPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getValidSession();
  if (!session) {
    redirect("/login");
  }

  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      items: {
        include: {
          item: true,
        },
      },
    },
  });

  if (!sale) {
    notFound();
  }

  const host = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${host}/verify?q=${encodeURIComponent(sale.receiptNo)}`;
  const qrCodeDataUrl = await generateQRCodeDataURL(verifyUrl);

  return (
    <div className="mx-auto max-w-3xl p-6 bg-white min-h-screen">
      <AutoPrint />
      
      {/* স্ক্রিন কন্ট্রোল বার */}
      <PrintToolbar />

      {/* মেমো প্যাড */}
      <div className="border border-gray-300 p-8 rounded-lg shadow-sm font-invoice">
        {/* মিল হেডার */}
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            নিশাত অটো রাইস মিল
          </h1>
          <p className="text-sm font-medium text-gray-600 mt-1">
            উন্নত মানের চাল ও তুষ বিক্রেতা
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            হাবু তাঁতীপাড়া, গজঘণ্টা, রংপুর। মোবাইলঃ 01700000000
          </p>
          <div className="mt-3 inline-block bg-gray-900 text-white text-xs uppercase font-bold tracking-widest px-3 py-1 rounded">
            বিক্রয় মেমো (Sales Invoice)
          </div>
        </div>

        {/* মেমো ইনফো ও ক্রেতার বিবরণ */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-sm items-start">
          <div className="space-y-1">
            <p className="text-gray-500">
              <span className="font-semibold text-gray-700">মেমো নং:</span>{" "}
              <span className="font-mono text-gray-900 font-bold">{sale.receiptNo}</span>
            </p>
            <p className="text-gray-500">
              <span className="font-semibold text-gray-700">তারিখ:</span>{" "}
              <span className="text-gray-900">{formatDate(sale.date, "bn")}</span>
            </p>
          </div>

          <div className="space-y-0.5 border-l pl-4">
            <p className="font-bold text-gray-800 text-xs uppercase tracking-wider">
              ক্রেতার বিবরণ:
            </p>
            <p className="font-bold text-gray-950 text-base">{sale.customer.name}</p>
            {sale.customer.phone && (
              <p className="text-gray-600 text-xs">ফোন: {sale.customer.phone}</p>
            )}
            {sale.customer.address && (
              <p className="text-gray-600 text-xs">ঠিকানা: {sale.customer.address}</p>
            )}
          </div>

          <div className="flex flex-col items-center justify-center border-l pl-2 text-center">
            {qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="Verification QR Code" className="w-20 h-20 border border-slate-200 p-1 rounded" />
            )}
            <span className="text-[10px] text-gray-500 mt-1 leading-tight">
              সত্যতা যাচাইয়ের জন্য QR স্ক্যান করুন
            </span>
          </div>
        </div>

        {/* পণ্য বিবরণী টেবিল */}
        <table className="w-full text-left text-sm mb-6 border-collapse">
          <thead>
            <tr className="border-y border-gray-300 bg-gray-50 font-bold text-gray-700">
              <th className="py-2.5 px-3 w-12 text-center">ক্রমিক</th>
              <th className="py-2.5 px-3">পণ্যের বিবরণ</th>
              <th className="py-2.5 px-3 text-right">পরিমাণ (Qty)</th>
              <th className="py-2.5 px-3 text-right">দর (Rate)</th>
              <th className="py-2.5 px-3 text-right">মোট টাকা</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sale.items.map((line, idx) => (
              <tr key={line.id} className="text-gray-800">
                <td className="py-3 px-3 text-center font-mono">{idx + 1}</td>
                <td className="py-3 px-3 font-semibold">{line.item.name}</td>
                <td className="py-3 px-3 text-right">
                  {formatNumber(line.quantity, "bn")} {line.item.unit}
                </td>
                <td className="py-3 px-3 text-right">
                  {formatTaka(line.rate, "bn")}
                </td>
                <td className="py-3 px-3 text-right font-medium">
                  {formatTaka(line.amount, "bn")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* হিসাব সারসংক্ষেপ */}
        <div className="flex justify-end mb-12">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>উপমোট (Subtotal):</span>
              <span>{formatTaka(sale.subtotal, "bn")}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>ছাড় (Discount):</span>
                <span>−{formatTaka(sale.discount, "bn")}</span>
              </div>
            )}
            <div className="border-t border-gray-300 my-1" />
            <div className="flex justify-between text-gray-900 font-bold text-base">
              <span>সর্বমোট (Grand Total):</span>
              <span>{formatTaka(sale.totalAmount, "bn")}</span>
            </div>
            <div className="flex justify-between text-brand-700 font-semibold">
              <span>পরিশোধিত (Paid):</span>
              <span>{formatTaka(sale.paidAmount, "bn")}</span>
            </div>
            <div className="border-t border-gray-300 my-1" />
            <div className="flex justify-between text-red-600 font-bold">
              <span>বকেয়া (Due):</span>
              <span>{formatTaka(sale.dueAmount, "bn")}</span>
            </div>
          </div>
        </div>

        {/* নোট */}
        {sale.notes && (
          <div className="bg-gray-50 border p-3 rounded text-xs text-gray-600 mb-12">
            <span className="font-semibold text-gray-700">নোট (Notes):</span> {sale.notes}
          </div>
        )}

        {/* সিগনেচার এরিয়া */}
        <div className="flex justify-between mt-16 text-xs text-gray-600 pt-8 px-4">
          <div className="text-center">
            <div className="w-32 border-t border-gray-400 pt-1.5">ক্রেতার স্বাক্ষর</div>
          </div>
          <div className="text-center">
            <div className="w-32 border-t border-gray-400 pt-1.5">ক্যাশিয়ারের স্বাক্ষর</div>
          </div>
          <div className="text-center">
            <div className="w-32 border-t border-gray-400 pt-1.5">অনুমোদিত স্বাক্ষর</div>
          </div>
        </div>
      </div>
    </div>
  );
}
