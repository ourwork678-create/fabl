import { prisma } from "@/lib/prisma";
import { CustomerView } from "./CustomerView";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    include: {
      sales: { select: { totalAmount: true, paidAmount: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { name: "asc" },
  });

  const parsedCustomers = customers.map((c) => {
    const totalBill = c.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const salesPaidSum = c.sales.reduce((sum, s) => sum + Number(s.paidAmount), 0);
    const standalonePaidSum = c.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPaid = salesPaidSum + standalonePaidSum;
    const calculatedDue = Math.max(0, totalBill - totalPaid);

    return {
      id: c.id,
      code: c.code,
      name: c.name,
      phone: c.phone,
      address: c.address,
      dueAmount: calculatedDue,
      notes: c.notes,
      totalBill,
      totalPaid,
    };
  });

  return <CustomerView initialCustomers={parsedCustomers} />;
}
