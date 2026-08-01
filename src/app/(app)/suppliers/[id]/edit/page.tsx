import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { PartyForm } from "../../../parties/PartyForm";
import { updateSupplier } from "../../../parties/actions";
import { getLang } from "@/lib/i18n-server";
import { ArrowLeft } from "lucide-react";

export default async function EditSupplierPage({
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

  const updateSupplierWithId = updateSupplier.bind(null, supplier.id);

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/suppliers" className="btn-ghost mb-4 -ml-2 inline-flex items-center gap-1.5 text-xs">
        <ArrowLeft size={16} /> {isEn ? "Back to Suppliers" : "সাপ্লায়ার তালিকায় ফিরুন"}
      </Link>
      <PageHeader
        title={isEn ? "Edit Supplier Info" : "সাপ্লায়ার তথ্য সম্পাদনা"}
        subtitle={supplier.name}
      />
      <PartyForm
        action={updateSupplierWithId}
        redirectTo="/suppliers"
        initialData={supplier}
        isSupplier
      />
    </div>
  );
}
