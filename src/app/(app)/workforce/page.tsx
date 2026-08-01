import { prisma } from "@/lib/prisma";
import { getLang } from "@/lib/i18n-server";
import { WorkforceView } from "./WorkforceView";

export default async function WorkforcePage() {
  const lang = await getLang();

  const [members, staffUsers, salaryList] = await Promise.all([
    prisma.workforceMember.findMany({
      include: {
        transactions: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { not: "OWNER" } },
      orderBy: { name: "asc" },
    }),
    prisma.salary.findMany({
      where: {
        user: { role: { not: "OWNER" } }, // Exclude owner
      },
      include: { user: true },
      orderBy: { month: "desc" },
      take: 20,
    }),
  ]);

  const parsedMembers = members.map((m) => {
    const totalBill = m.transactions
      .filter((t) => t.type === "BILL")
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalPaid = m.transactions
      .filter((t) => t.type === "PAYMENT")
      .reduce((s, t) => s + Number(t.amount), 0);

    return {
      ...m,
      rateAmount: Number(m.rateAmount),
      balance: Number(m.balance),
      totalBill,
      totalPaid,
    };
  });

  const parsedStaff = staffUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    designation: (u as any).designation || null,
    role: u.role,
    monthlySalary: u.monthlySalary ? Number(u.monthlySalary) : 0,
    active: u.active,
  }));

  const parsedSalaries = salaryList.map((s) => ({
    ...s,
    amount: Number(s.amount),
    netAmount: Number(s.netAmount),
  }));

  return (
    <WorkforceView
      initialMembers={parsedMembers}
      staffUsers={parsedStaff}
      initialSalaries={parsedSalaries}
    />
  );
}
