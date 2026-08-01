import Link from "next/link";
import { Search, ShieldCheck, QrCode, AlertTriangle, CheckCircle2, FileText, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { formatTaka, formatDate } from "@/lib/utils";

type VerifiedResult = {
  recordType: "SALE" | "PURCHASE" | "PAYMENT" | "WORKFORCE" | "BATCH";
  title: string;
  memoNo: string;
  date: Date;
  partyName: string;
  partyPhone?: string | null;
  totalAmount: number;
  paidAmount?: number;
  dueAmount?: number;
  details: string;
  printUrl: string;
};

export default async function VerificationSearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const lang = await getLang();
  const isEn = lang === "en";

  // URL ও প্লাস সিগন্যাল স্যানিটাইজেশন (+WRK-A0W3LO -> WRK-A0W3LO)
  const rawQ = (searchParams.q || "").replace(/^[\+\s]+/, "").trim();
  const cleanQ = rawQ.replace(/^(VOU|SAL|PUR|BAT|BYP|WRK)-/i, "").trim();
  // ফাঁকা cleanQ (শুধু প্রিফিক্স সার্চ) হলে includes("") সব মিলিয়ে ফেলে — তাই গার্ড দরকার
  const hasCleanQ = cleanQ.length > 0;

  let searched = false;
  let verifiedRecord: VerifiedResult | null = null;

  if (rawQ) {
    searched = true;

    // ১. চাল ও উপজাত বিক্রয় (Sale) চেক
    const sales = await prisma.sale.findMany({
      where: {
        OR: [
          { receiptNo: { equals: rawQ } },
          { receiptNo: { contains: rawQ } },
          { receiptNo: { contains: cleanQ } },
          { id: { equals: rawQ } },
        ],
      },
      include: { customer: true, items: { include: { item: true } } },
      take: 5,
    });

    const matchedSale = sales.find(
      (s) =>
        s.receiptNo.toLowerCase() === rawQ.toLowerCase() ||
        (hasCleanQ && s.receiptNo.toLowerCase().includes(cleanQ.toLowerCase())) ||
        s.id.toLowerCase() === rawQ.toLowerCase() ||
        (hasCleanQ && s.id.toLowerCase().endsWith(cleanQ.toLowerCase()))
    );

    if (matchedSale) {
      verifiedRecord = {
        recordType: "SALE",
        title: isEn ? "Rice / Product Sale Invoice" : "চাল ও উপজাত বিক্রয় রসিদ (মেমো)",
        memoNo: matchedSale.receiptNo,
        date: matchedSale.date,
        partyName: matchedSale.customer?.name || (isEn ? "Cash Buyer" : "নগদ কাস্টমার"),
        partyPhone: matchedSale.customer?.phone,
        totalAmount: Number(matchedSale.totalAmount),
        paidAmount: Number(matchedSale.paidAmount),
        dueAmount: Number(matchedSale.dueAmount),
        details: matchedSale.items
          .map((i) => `${i.item?.name}: ${Number(i.quantity)} ${i.item?.unit || "বস্তা"}`)
          .join(", "),
        printUrl: `/sales/${matchedSale.id}/print`,
      };
    }

    // ২. ধান ও কাঁচামাল ক্রয় (Purchase) চেক
    if (!verifiedRecord) {
      const purchases = await prisma.purchase.findMany({
        where: {
          OR: [
            { receiptNo: { equals: rawQ } },
            { receiptNo: { contains: rawQ } },
            { receiptNo: { contains: cleanQ } },
            { id: { equals: rawQ } },
          ],
        },
        include: { supplier: true, items: { include: { item: true } } },
        take: 5,
      });

      const matchedPurchase = purchases.find(
        (p) =>
          p.receiptNo.toLowerCase() === rawQ.toLowerCase() ||
          (hasCleanQ && p.receiptNo.toLowerCase().includes(cleanQ.toLowerCase())) ||
          p.id.toLowerCase() === rawQ.toLowerCase() ||
          (hasCleanQ && p.id.toLowerCase().endsWith(cleanQ.toLowerCase()))
      );

      if (matchedPurchase) {
        verifiedRecord = {
          recordType: "PURCHASE",
          title: isEn ? "Paddy Purchase Receipt Memo" : "ধান ক্রয় রশিদ (মেমো)",
          memoNo: matchedPurchase.receiptNo,
          date: matchedPurchase.date,
          partyName: matchedPurchase.supplier?.name || "—",
          partyPhone: matchedPurchase.supplier?.phone,
          totalAmount: Number(matchedPurchase.totalAmount),
          paidAmount: Number(matchedPurchase.paidAmount),
          dueAmount: Number(matchedPurchase.dueAmount),
          details: matchedPurchase.items
            .map((i) => `${i.item?.name}: ${Number(i.quantity)} ${i.item?.unit || "মণ"}`)
            .join(", "),
          printUrl: `/purchases/${matchedPurchase.id}/print`,
        };
      }
    }

    // ৩. টাকা পরিশোধ/জমা ভাউচার (Payment) চেক
    if (!verifiedRecord) {
      const payments = await prisma.payment.findMany({
        where: {
          OR: [
            { id: { equals: rawQ } },
            { refNo: { equals: rawQ } },
            { refNo: { contains: rawQ } },
            { refNo: { contains: cleanQ } },
          ],
        },
        include: { customer: true, supplier: true },
        take: 10,
      });

      const matchedPayment = payments.find(
        (p) =>
          (p.refNo && p.refNo.toLowerCase() === rawQ.toLowerCase()) ||
          (hasCleanQ && !!p.refNo && p.refNo.toLowerCase().includes(cleanQ.toLowerCase())) ||
          p.id.toLowerCase() === rawQ.toLowerCase() ||
          (hasCleanQ && p.id.toLowerCase().endsWith(cleanQ.toLowerCase()))
      );

      if (matchedPayment) {
        const isPaid = matchedPayment.direction === "PAID";
        verifiedRecord = {
          recordType: "PAYMENT",
          title: isPaid ? "সাপ্লায়ার টাকা পরিশোধ ভাউচার" : "কাস্টমার টাকা জমা গ্রহণ ভাউচার",
          memoNo: matchedPayment.refNo || `VOU-${matchedPayment.id.slice(-6).toUpperCase()}`,
          date: matchedPayment.date,
          partyName: matchedPayment.customer?.name || matchedPayment.supplier?.name || "—",
          partyPhone: matchedPayment.customer?.phone || matchedPayment.supplier?.phone,
          totalAmount: Number(matchedPayment.amount),
          details: matchedPayment.note || (isPaid ? "নগদ/ব্যাংক মারফত টাকা পরিশোধ" : "নগদ টাকা গ্রহণ"),
          printUrl: `/payments/${matchedPayment.id}/print`,
        };
      }
    }

    // ৪. কর্মীবাহিনী মজুরি ও বিল (WorkforceTransaction) চেক
    if (!verifiedRecord) {
      const wtxs = await prisma.workforceTransaction.findMany({
        where: {
          OR: [
            { id: rawQ },
            ...(hasCleanQ ? [{ id: { contains: cleanQ.toLowerCase() } }] : []),
          ],
        },
        include: { workforceMember: true },
        take: 20,
        orderBy: { date: "desc" },
      });

      const matchedWtx = wtxs.find(
        (w) =>
          w.id.toLowerCase() === rawQ.toLowerCase() ||
          (hasCleanQ && w.id.toLowerCase().endsWith(cleanQ.toLowerCase())) ||
          `WRK-${w.id.slice(-6).toUpperCase()}`.toLowerCase() === rawQ.toLowerCase() ||
          (hasCleanQ && `WRK-${w.id.slice(-6).toUpperCase()}`.toLowerCase().endsWith(cleanQ.toLowerCase()))
      );

      if (matchedWtx) {
        const isBill = matchedWtx.type === "BILL";
        verifiedRecord = {
          recordType: "WORKFORCE",
          title: isBill ? "কর্মী কাজ/বিল এন্ট্রি ভাউচার" : "কর্মী মজুরি পরিশোধ ভাউচার",
          memoNo: `WRK-${matchedWtx.id.slice(-6).toUpperCase()}`,
          date: matchedWtx.date,
          partyName: matchedWtx.workforceMember.name,
          partyPhone: matchedWtx.workforceMember.phone,
          totalAmount: Number(matchedWtx.amount),
          details: matchedWtx.description || (isBill ? "কারখানা কাজ/বিল" : "মজুরি পরিশোধ"),
          printUrl: `/workforce/transactions/${matchedWtx.id}/print`,
        };
      }
    }

    // ৫. মিলিং প্রসেসিং (ProductionBatch) চেক
    if (!verifiedRecord) {
      const batch = await prisma.productionBatch.findFirst({
        where: {
          OR: [
            { batchNo: { equals: rawQ } },
            { batchNo: { contains: rawQ } },
            { batchNo: { contains: cleanQ } },
            { id: { equals: rawQ } },
          ],
        },
      });

      if (batch) {
        verifiedRecord = {
          recordType: "BATCH",
          title: isEn ? "Production Milling Batch" : "মিলিং প্রোডাকশন ব্যাচ রেকর্ড",
          memoNo: batch.batchNo,
          date: batch.date,
          partyName: isEn ? "Factory Milling" : "কারখানা মিলিং সেকশন",
          totalAmount: Number(batch.recoveryRate || 0),
          details: `চাল উত্তোলন হার: ${Number(batch.recoveryRate || 0).toFixed(2)}%`,
          printUrl: `/production`,
        };
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-[30px] px-[5px]">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          {t(lang, "verify.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t(lang, "verify.subtitle")}
        </p>
      </div>

      {/* সার্চ কার্ড */}
      <Card className="max-w-2xl mx-auto p-6 border-slate-200 shadow-sm">
        <form method="GET" className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            {t(lang, "verify.searchPlaceholder")}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                name="q"
                defaultValue={rawQ}
                placeholder={isEn ? "e.g. PUR-2026-0003, WRK-A0W3LO or VOU-2607-8492" : "যেমন: PUR-2026-0003, WRK-A0W3LO অথবা VOU-2607-8492"}
                className="input pl-10 w-full font-mono font-semibold text-gray-900"
                required
              />
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2 font-semibold">
              <ShieldCheck size={16} /> {t(lang, "verify.searchButton")}
            </button>
          </div>
        </form>

        {/* ভেরিফাইড মেমো কার্ড */}
        {verifiedRecord && (
          <div className="mt-6 p-5 bg-emerald-50/90 border border-emerald-200 text-emerald-900 rounded-2xl space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-emerald-200/80 pb-3">
              <CheckCircle2 size={26} className="text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-base text-emerald-950">
                  ✓ {isEn ? "Authentic Verified Official Record!" : "সঠিক ও অনুমোদিত অফিশিয়াল প্রামাণ্য রসিদ!"}
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {isEn
                    ? "This transaction is verified in Nishat Auto Rice Mill official database."
                    : "এই লেনদেনটি নিশাত অটো রাইস মিলের অফিশিয়াল ডাটাবেসে নিবন্ধিত ও ১০০% সঠিক বলে প্রমাণিত।"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-emerald-800 font-semibold">{isEn ? "Record Type" : "রসিদের ধরণ"}:</span>
                <p className="font-bold text-gray-900 mt-0.5">{verifiedRecord.title}</p>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-emerald-800 font-semibold">{isEn ? "Memo / Invoice No" : "মেমো/রশিদ নং"}:</span>
                <p className="font-mono font-bold text-gray-900 text-sm mt-0.5">{verifiedRecord.memoNo}</p>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-emerald-800 font-semibold">{isEn ? "Date" : "তারিখ"}:</span>
                <p className="font-bold text-gray-900 mt-0.5">{formatDate(verifiedRecord.date, lang)}</p>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-emerald-800 font-semibold">{isEn ? "Party / Worker Name" : "কাস্টমার/কর্মী/সাপ্লায়ার"}:</span>
                <p className="font-bold text-gray-900 mt-0.5">
                  {verifiedRecord.partyName} {verifiedRecord.partyPhone ? `(${verifiedRecord.partyPhone})` : ""}
                </p>
              </div>

              <div className="col-span-2 bg-white/80 p-3 rounded-xl border border-emerald-100 space-y-1">
                <span className="text-emerald-800 font-semibold">{isEn ? "Items / Details" : "পণ্য ও বিবরণ"}:</span>
                <p className="font-medium text-gray-900">{verifiedRecord.details}</p>
                {verifiedRecord.recordType !== "BATCH" && (
                  <div className="flex items-center justify-between pt-2 border-t border-emerald-100 text-xs font-bold">
                    <span>{isEn ? "Total Amount:" : "মোট টাকার পরিমাণ:"} <span className="text-emerald-800 text-sm">{formatTaka(verifiedRecord.totalAmount, lang)}</span></span>
                    {verifiedRecord.dueAmount !== undefined && verifiedRecord.dueAmount > 0 && (
                      <span className="text-amber-800">বকেয়া: {formatTaka(verifiedRecord.dueAmount, lang)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-200/80 flex justify-end">
              <Link
                href={verifiedRecord.printUrl}
                target="_blank"
                className="btn bg-emerald-700 text-white hover:bg-emerald-800 text-xs py-2 px-4 rounded-xl font-semibold flex items-center gap-1.5 shadow-2xs"
              >
                <FileText size={15} /> {isEn ? "View & Print Official Receipt Memo" : "অফিশিয়াল রসিদ মেমো প্রিন্ট করুন"}
              </Link>
            </div>
          </div>
        )}

        {/* যদি কোনো রেকর্ড না পাওয়া যায় */}
        {searched && !verifiedRecord && (
          <div className="mt-6 p-5 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-start gap-3 shadow-xs">
            <AlertTriangle size={26} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-950">{t(lang, "verify.invalidTitle")}</h4>
              <p className="text-xs text-red-700 mt-1">{t(lang, "verify.invalidDesc")}</p>
            </div>
          </div>
        )}
      </Card>

      {/* নির্দেশিকা কার্ডসমূহ */}
      <div className="max-w-4xl mx-auto grid gap-4 sm:grid-cols-3 pt-4">
        <Card className="p-5 border-slate-200">
          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center mb-3">
            <QrCode size={20} />
          </div>
          <h3 className="font-bold text-sm text-slate-900 mb-1">
            {isEn ? "1. Scan QR Code" : "১. QR কোড স্ক্যান"}
          </h3>
          <p className="text-xs text-slate-500">
            {isEn
              ? "Scan the QR code on the receipt using a smartphone camera to view authentic records."
              : "ইনভয়েস বা ভাউচারে থাকা QR কোডটি স্ক্যান করলেই সরাসরি অনলাইন প্রামাণ্য হিসাব দেখাবে।"}
          </p>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3">
            <Search size={20} />
          </div>
          <h3 className="font-bold text-sm text-slate-900 mb-1">
            {isEn ? "2. Search Receipt No" : "২. রসিদ নম্বর সার্চ"}
          </h3>
          <p className="text-xs text-slate-500">
            {isEn
              ? "Type any receipt or memo number (e.g. PUR-2026-0003 or WRK-A0W3LO) and click verify."
              : "যেকোনো রসিদ/মেমো নম্বর (যেমন: PUR-2026-0003 বা WRK-A0W3LO) সার্চ বক্সে লিখে যাচাই করুন।"}
          </p>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
            <CheckCircle2 size={20} />
          </div>
          <h3 className="font-bold text-sm text-slate-900 mb-1">
            {isEn ? "3. Verify Database Record" : "৩. ডাটাবেস মিলান"}
          </h3>
          <p className="text-xs text-slate-500">
            {isEn
              ? "Compare the physical receipt with system database total, paid amount & due."
              : "গ্রাহকের পেশকৃত কাগজের সাথে ডাটাবেসের মূল লেনদেন, মোট টাকা ও পরিশোধের পরিমাণ মিলিয়ে নিন।"}
          </p>
        </Card>
      </div>
    </div>
  );
}
