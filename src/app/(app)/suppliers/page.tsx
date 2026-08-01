import { prisma } from "@/lib/prisma";
import { SupplierView } from "./SupplierView";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    include: {
      purchases: { select: { totalAmount: true, paidAmount: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { name: "asc" },
  });

  const parsedSuppliers = suppliers.map((s) => {
    const totalBill = s.purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const purchasePaidSum = s.purchases.reduce((sum, p) => sum + Number(p.paidAmount), 0);
    const standalonePaidSum = s.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    
    // মোট পরিশোধ = ক্রয়ের সময় পরিশোধ + পরবর্তীতে ক্যাশ/ব্যাংকে পরিশোধ
    const totalPaid = purchasePaidSum + standalonePaidSum;
    
    // নিট বকেয়া দেওনা = মোট ধান ক্রয় (বিল) - মোট পরিশোধ
    const calculatedDue = Math.max(0, totalBill - totalPaid);

    return {
      id: s.id,
      code: s.code,
      name: s.name,
      phone: s.phone,
      address: s.address,
      dueAmount: calculatedDue,
      notes: s.notes,
      totalBill,
      totalPaid,
    };
  });

  return <SupplierView initialSuppliers={parsedSuppliers} />;
}
