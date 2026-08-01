import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLang } from "@/lib/i18n-server";
import { SupplierProfileView } from "./SupplierProfileView";

export default async function SupplierProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const lang = await getLang();
  const isEn = lang === "en";

  const supplier = await prisma.supplier.findUnique({
    where: { id: params.id },
  });

  if (!supplier) notFound();

  const [purchases, payments] = await Promise.all([
    prisma.purchase.findMany({
      where: { supplierId: supplier.id },
      include: { items: { include: { item: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.payment.findMany({
      where: { supplierId: supplier.id },
      orderBy: { date: "desc" },
    }),
  ]);

  const totalPurchasesAmount = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  // বকেয়া ডাটাবেস-এ রক্ষিত মানই নির্ভরযোগ্য উৎস (payments ইতিমধ্যেই purchase.paidAmount-এ বরাদ্দ হয়)
  const calculatedDue = Number(supplier.dueAmount);

  const ledgerEntries = [
    ...purchases.map((p) => ({
      id: p.id,
      date: p.date,
      type: "PURCHASE" as const,
      refNo: p.receiptNo,
      title: isEn ? "Paddy Purchase" : "ধান ক্রয় / বিল",
      amount: Number(p.totalAmount),
      details: p.items.map((i) => `${i.item?.name}: ${Number(i.quantity)} ${i.item?.unit || "মণ"}`).join(", "),
    })),
    ...payments.map((p) => ({
      id: p.id,
      date: p.date,
      type: "PAYMENT" as const,
      refNo: p.refNo || `VOU-${p.id.slice(-6).toUpperCase()}`,
      title: isEn ? "Payment Paid" : "টাকা পরিশোধ",
      amount: Number(p.amount),
      method: p.method,
      details: p.note ? `নোট: ${p.note}` : (isEn ? "Paddy purchase payout" : "ধান ক্রয়ের বকেয়া পরিশোধ"),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const serializedSupplier = {
    ...supplier,
    dueAmount: calculatedDue,
  };

  return (
    <SupplierProfileView
      supplier={serializedSupplier}
      totalPurchasesAmount={totalPurchasesAmount}
      ledgerEntries={ledgerEntries}
      lang={lang}
    />
  );
}
