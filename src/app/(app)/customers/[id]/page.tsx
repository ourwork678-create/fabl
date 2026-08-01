import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLang } from "@/lib/i18n-server";
import { CustomerProfileView } from "./CustomerProfileView";

export default async function CustomerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const lang = await getLang();
  const isEn = lang === "en";

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
  });

  if (!customer) notFound();

  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId: customer.id },
      include: { items: { include: { item: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.payment.findMany({
      where: { customerId: customer.id },
      orderBy: { date: "desc" },
    }),
  ]);

  const totalSalesAmount = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  // বকেয়া ডাটাবেস-এ রক্ষিত মানই নির্ভরযোগ্য উৎস (payments ইতিমধ্যেই sale.paidAmount-এ বরাদ্দ হয়)
  const currentDue = Number(customer.dueAmount);

  const ledgerEntries = [
    ...sales.map((s) => ({
      id: s.id,
      date: s.date,
      type: "SALE" as const,
      refNo: s.receiptNo,
      title: isEn ? "Rice / Products Sale" : "চাল ও প্রোডাক্টস বিক্রয় মেমো",
      amount: Number(s.totalAmount),
      details: s.items.map((i) => `${i.item?.name}: ${Number(i.quantity)} ${i.item?.unit || "বস্তা"}`).join(", "),
    })),
    ...payments.map((p) => ({
      id: p.id,
      date: p.date,
      type: "PAYMENT" as const,
      refNo: p.refNo || `VOU-${p.id.slice(-6).toUpperCase()}`,
      title: isEn ? "Payment Received" : "টাকা জমা গ্রহণ",
      amount: Number(p.amount),
      method: p.method,
      details: p.note ? `নোট: ${p.note}` : (isEn ? "Rice sales payout" : "চাল বিক্রয়ের বকেয়া টাকা জমা"),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const serializedCustomer = {
    ...customer,
    dueAmount: currentDue,
  };

  return (
    <CustomerProfileView
      customer={serializedCustomer}
      totalSalesAmount={totalSalesAmount}
      ledgerEntries={ledgerEntries}
      lang={lang}
    />
  );
}
