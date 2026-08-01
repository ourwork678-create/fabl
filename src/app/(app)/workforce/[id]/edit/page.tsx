import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLang } from "@/lib/i18n-server";
import { PageHeader } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { EditWorkforceForm } from "./EditWorkforceForm";

export default async function EditWorkforceMemberPage({ params }: { params: { id: string } }) {
  const lang = await getLang();
  
  const member = await prisma.workforceMember.findUnique({
    where: { id: params.id },
  });

  if (!member) return notFound();

  const serializedMember = {
    ...member,
    rateAmount: Number(member.rateAmount),
    balance: Number(member.balance),
  };

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/workforce" className="btn-ghost mb-4 -ml-2 inline-flex items-center gap-1.5 text-xs font-semibold">
        <ArrowLeft size={16} /> {lang === "en" ? "Back to Workforce" : "ফিরে যান"}
      </Link>
      <PageHeader title={lang === "en" ? "Edit Member" : "কর্মী তথ্য সম্পাদন"} />

      <EditWorkforceForm member={serializedMember} isEn={lang === "en"} />
    </div>
  );
}
