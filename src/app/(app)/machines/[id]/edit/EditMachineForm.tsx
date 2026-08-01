"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { updateMachine } from "../../actions";

type Machine = {
  id: string;
  name: string;
  code: string;
  type: string | null;
  capacityPerHr: any;
};

// Helper to determine if an item is a Machine
function isMachinery(type: string | null): boolean {
  if (!type) return false; // Default to tools/equipment (not machine) if type is not set
  const t = type.trim().toLowerCase();
  return (
    t === "মেশিন" ||
    t === "machine" ||
    t === "dryer" ||
    t === "polisher" ||
    t === "boiler" ||
    t === "huller"
  );
}

export function EditMachineForm({ machine }: { machine: Machine }) {
  const { t, lang } = useLang();
  const isEn = lang === "en";

  const isMachine = isMachinery(machine.type);
  const initialType = machine.type || "";
  const initialQty = machine.capacityPerHr ? Number(machine.capacityPerHr) : 0;

  const updateMachineWithId = updateMachine.bind(null, machine.id);

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/machines" className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={16} /> {t("common.back")}
      </Link>
      <PageHeader
        title={
          isEn
            ? `Edit ${isMachine ? "Machinery" : "Equipment"}`
            : `${isMachine ? "মেশিনারি" : "উপকরণ"} সম্পাদনা`
        }
      />

      <form action={updateMachineWithId} className="card space-y-5 p-6">
        {/* মেশিনারি এডিটের ক্ষেত্রে নাম ও ব্র্যান্ড */}
        {isMachine ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t("mach.form.name")} *</label>
              <input
                name="name"
                defaultValue={machine.name}
                required
                className="input"
                placeholder={isEn ? "Enter name" : "নাম লিখুন"}
              />
            </div>
            <div>
              <label className="label">{isEn ? "Brand *" : "ব্র্যান্ড *"}</label>
              <input
                name="brand"
                defaultValue={machine.code}
                required
                className="input"
                placeholder={isEn ? "e.g. BOI-01" : "যেমন: BOI-01"}
              />
            </div>
          </div>
        ) : (
          /* সরঞ্জাম/উপকরণ এডিটের ক্ষেত্রে নাম, ধরন ও পরিমাণ (কোনো ব্র্যান্ড থাকবে না) */
          <div className="space-y-5">
            <div>
              <label className="label">{t("mach.form.name")} *</label>
              <input
                name="name"
                defaultValue={machine.name}
                required
                className="input"
                placeholder={isEn ? "Enter name" : "নাম লিখুন"}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t("mach.type")}</label>
                <input
                  name="type"
                  defaultValue={initialType}
                  className="input"
                  placeholder={isEn ? "Enter type (e.g. Tools, Sacks)" : "ধরন লিখুন (যেমন: টুলস, বস্তা)"}
                />
              </div>

              <div>
                <label className="label">{isEn ? "Quantity *" : "পরিমাণ *"}</label>
                <input
                  name="quantity"
                  type="number"
                  defaultValue={initialQty}
                  required
                  min="0"
                  className="input"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* সেভ বাটন */}
        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary">
            {isEn ? "Save" : "সেভ"}
          </button>
        </div>
      </form>
    </div>
  );
}
