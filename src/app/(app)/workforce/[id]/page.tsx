import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLang } from "@/lib/i18n-server";
import { MemberProfileView } from "./MemberProfileView";

export default async function WorkforceMemberDetailPage({ params }: { params: { id: string } }) {
  const lang = await getLang();

  const member = await prisma.workforceMember.findUnique({
    where: { id: params.id },
    include: {
      transactions: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!member) return notFound();

  const serializedMember = {
    ...member,
    rateAmount: Number(member.rateAmount),
    balance: Number(member.balance),
    transactions: member.transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
    })),
  };

  return <MemberProfileView member={serializedMember} lang={lang} />;
}
