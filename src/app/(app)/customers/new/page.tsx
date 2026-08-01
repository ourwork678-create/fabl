import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { PartyForm } from "../../parties/PartyForm";
import { createCustomer } from "../../parties/actions";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { ArrowLeft } from "lucide-react";

export default async function NewCustomerPage() {
  const lang = await getLang();
  return (
    <div className="mx-auto max-w-lg">
      <Link href="/customers" className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={16} /> {t(lang, "common.back")}
      </Link>
      <PageHeader title={t(lang, "cust.form.title")} />
      <PartyForm action={createCustomer} redirectTo="/customers" />
    </div>
  );
}
