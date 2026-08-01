import { prisma } from "@/lib/prisma";
import { SupplierView } from "./SupplierView";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    include: {
      purchases: { select: { totalAmount: true } },
    },
    orderBy: { name: "asc" },
  });

  const parsedSuppliers = suppliers.map((s) => {
    const totalBill = s.purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    // সংরক্ষিত dueAmount-ই নির্ভরযোগ্য উৎস — allocatePayment প্রতিটি পেমেন্ট
    // ইতিমধ্যে purchase.paidAmount-এ বরাদ্দ করে, তাই আলাদা করে payments যোগ করলে
    // একই টাকা দুইবার গণনা হয়ে দেনা কম দেখাত।
    const dueAmount = Number(s.dueAmount);
    const totalPaid = Math.max(0, totalBill - dueAmount);

    return {
      id: s.id,
      code: s.code,
      name: s.name,
      phone: s.phone,
      address: s.address,
      dueAmount,
      notes: s.notes,
      totalBill,
      totalPaid,
    };
  });

  return <SupplierView initialSuppliers={parsedSuppliers} />;
}
