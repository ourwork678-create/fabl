import { prisma } from "@/lib/prisma";
import { CustomerView } from "./CustomerView";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    include: {
      sales: { select: { totalAmount: true } },
    },
    orderBy: { name: "asc" },
  });

  const parsedCustomers = customers.map((c) => {
    const totalBill = c.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    // সংরক্ষিত dueAmount-ই নির্ভরযোগ্য উৎস — allocatePayment প্রতিটি পেমেন্ট
    // ইতিমধ্যে sale.paidAmount-এ বরাদ্দ করে, তাই আলাদা করে payments যোগ করলে
    // একই টাকা দুইবার গণনা হয়ে বকেয়া কম দেখাত।
    const dueAmount = Number(c.dueAmount);
    const totalPaid = Math.max(0, totalBill - dueAmount);

    return {
      id: c.id,
      code: c.code,
      name: c.name,
      phone: c.phone,
      address: c.address,
      dueAmount,
      notes: c.notes,
      totalBill,
      totalPaid,
    };
  });

  return <CustomerView initialCustomers={parsedCustomers} />;
}
