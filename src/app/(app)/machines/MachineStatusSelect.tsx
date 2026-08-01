"use client";

import { useTransition } from "react";
import { MACHINE_STATUSES } from "@/lib/constants";
import { useLang } from "@/components/LangProvider";

export function MachineStatusSelect({ id, status }: { id: string; status: string }) {
  const { lbl } = useLang();
  const [pending, start] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.set("status", e.target.value);
    start(async () => {
      try {
        const { setMachineStatus } = await import("./actions");
        await setMachineStatus(id, fd);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  return (
    <select defaultValue={status} onChange={onChange} disabled={pending} className="input text-xs">
      {MACHINE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {lbl("machineStatus", s)}
        </option>
      ))}
    </select>
  );
}
