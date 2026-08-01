import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { PartyForm } from "../../../parties/PartyForm";
import { updateCustomer } from "../../../parties/actions";
import { getLang } from "@/lib/i18n-server";
import { ArrowLeft } from "lucide-react";

export default async function EditCustomerPage({
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

  const updateCustomerWithId = updateCustomer.bind(null, customer.id);

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/customers" className="btn-ghost mb-4 -ml-2 inline-flex items-center gap-1.5 text-xs">
        <ArrowLeft size={16} /> {isEn ? "Back to Customers" : "কাস্টমার তালিকায় ফিরুন"}
      </Link>
      <PageHeader
        title={isEn ? "Edit Customer Info" : "কাস্টমার তথ্য সম্পাদনা"}
        subtitle={customer.name}
      />
      <PartyForm
        action={updateCustomerWithId}
        redirectTo="/customers"
        initialData={customer}
      />
    </div>
  );
}
