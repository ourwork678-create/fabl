"use client";

import { unwrap } from "@/lib/action-result";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const { t } = useLang();
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      try {
        const { toggleUserActive } = await import("./actions");
        unwrap(await toggleUserActive(id));
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  return (
    <button onClick={toggle} disabled={pending} className="btn-ghost px-2 py-1 text-xs">
      {pending ? <Loader2 size={12} className="animate-spin" /> : active ? t("set.disable") : t("set.enable")}
    </button>
  );
}
