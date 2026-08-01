"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { formatNumber, formatDate } from "@/lib/utils";
import { useLang } from "@/components/LangProvider";
import { Cog, Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { MACHINE_STATUSES } from "@/lib/constants";

type Log = {
  temperature: number | null;
  vibration: number | null;
  powerKw: number | null;
  rpm: number | null;
  throughput: number | null;
};

type Machine = {
  id: string;
  name: string;
  code: string;
  type: string | null;
  capacityPerHr: any;
  status: string;
  createdAt: any;
  lastLog: Log | null;
};

// Pastel colors: WhatsApp light green, soft light blue, soft orange
const STATUS_COLOR: Record<string, string> = {
  RUNNING: "bg-[#dcf8c6] text-[#075e54] border border-[#b7eb9e]",
  MAINTENANCE: "bg-[#e6f2ff] text-[#007FFF] border border-[#b3d7ff]",
  OFFLINE: "bg-[#ffedd5] text-[#c2410c] border border-[#fed7aa]",
  IDLE: "bg-[#ffedd5] text-[#c2410c] border border-[#fed7aa]",
};

const STATUS_BORDER: Record<string, string> = {
  RUNNING: "border-l-[#25D366]",
  MAINTENANCE: "border-l-[#007FFF]",
  OFFLINE: "border-l-[#f97316]",
  IDLE: "border-l-[#f97316]",
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

export function MachinesView({ initialMachines }: { initialMachines: Machine[] }) {
  const { t, lbl, lang } = useLang();
  const [machines, setMachines] = useState<Machine[]>(initialMachines);
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});

  const isEn = lang === "en";

  // Polling monitoring logs every 5 seconds
  useEffect(() => {
    async function fetchMachines() {
      try {
        const res = await fetch("/api/monitoring", { cache: "no-store" });
        const data = await res.json();
        if (data && data.machines) {
          setMachines(data.machines);
        }
      } catch {
        // ignore
      }
    }
    const timer = setInterval(fetchMachines, 5000);
    return () => clearInterval(timer);
  }, []);

  async function handleStatusChange(id: string, newStatus: string) {
    setPendingMap((prev) => ({ ...prev, [id]: true }));

    // Optimistic local state update
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    );

    try {
      const fd = new FormData();
      fd.set("status", newStatus);
      const { setMachineStatus } = await import("./actions");
      await setMachineStatus(id, fd);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPendingMap((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        isEn
          ? "Are you sure you want to delete this item?"
          : "আপনি কি নিশ্চিত যে এই আইটেমটি মুছে ফেলতে চান?"
      )
    )
      return;

    setPendingMap((prev) => ({ ...prev, [id]: true }));
    try {
      const { deleteMachine } = await import("./actions");
      await deleteMachine(id);
      // Remove from local list
      setMachines((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPendingMap((prev) => ({ ...prev, [id]: false }));
    }
  }

  // Split into Machinery and Tools/Materials
  const machinery = machines.filter((m) => isMachinery(m.type));
  const materials = machines.filter((m) => !isMachinery(m.type));

  // Summary counts for Machinery
  const machineryTotal = machinery.length;
  const machineryRunning = machinery.filter((m) => m.status === "RUNNING").length;
  const machineryOthers = machineryTotal - machineryRunning;

  // Summary counts for Materials
  const materialsTotal = materials.length;
  const materialsTools = materials.filter((m) => m.type === "টুলস").length;
  const materialsSacks = materials.filter((m) => m.type === "বস্তা").length;

  return (
    <div className="space-y-12">
      {/* ==================== মেশিনারি সেকশন ==================== */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Cog className="text-[#7c3aed]" size={20} />
            {isEn ? "Machinery" : "মেশিনারি"}
          </h2>
          <Link
            href="/machines/new-machinery"
            className="btn bg-[#7c3aed] text-white hover:bg-violet-700 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5"
          >
            <Plus size={14} />
            {isEn ? "Add Machinery" : "নতুন মেশিনারি"}
          </Link>
        </div>

        {/* মেশিনারি ম্যাট্রিক কার্ডসমূহ */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="card-gradient">
            <p className="text-xs text-gray-500">{isEn ? "Total Machinery" : "মোট মেশিনারি"}</p>
            <p className="text-lg font-bold text-gray-900">{formatNumber(machineryTotal, lang)}</p>
          </Card>
          <Card className="card-gradient">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25D366]"></span>
              </span>
              <p className="text-xs text-gray-500">{isEn ? "Running" : "চলমান"}</p>
            </div>
            <p className="text-lg font-bold text-[#25D366]">{formatNumber(machineryRunning, lang)}</p>
          </Card>
          <Card className="card-gradient">
            <p className="text-xs text-gray-500">{isEn ? "Closed / Maintenance" : "বন্ধ/মেরামতে"}</p>
            <p className="text-lg font-bold text-gray-900">{formatNumber(machineryOthers, lang)}</p>
          </Card>
        </div>

        {/* মেশিনারি কার্ড গ্রিড */}
        {machinery.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center text-xs text-gray-500">
            {isEn ? "No machinery found" : "কোনো মেশিনারি পাওয়া যায়নি"}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {machinery.map((m) => {
              const isPending = pendingMap[m.id] || false;
              
              // Map IDLE to OFFLINE
              const displayStatus = m.status === "IDLE" ? "OFFLINE" : m.status;
              const options = ["RUNNING", "MAINTENANCE", "OFFLINE"];

              return (
                <Card
                  key={m.id}
                  className={`border-l-4 ${
                    STATUS_BORDER[displayStatus] ?? "border-l-slate-300"
                  } transition-all duration-200 hover:shadow-md relative overflow-hidden`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                      <p className="font-mono text-[10px] text-gray-400">
                        {isEn ? "Brand" : "ব্র্যান্ড"}: {m.code}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        STATUS_COLOR[displayStatus] ?? "bg-gray-400"
                      }`}
                    >
                      {lbl("machineStatus", displayStatus)}
                    </span>
                  </div>

                  {/* স্ট্যাটাস আপডেট ড্রপডাউন ও অ্যাকশন */}
                  <div className="mt-4 border-t border-slate-50 pt-2.5 space-y-2.5">
                    <div className="relative flex-1">
                      <select
                        value={displayStatus}
                        disabled={isPending}
                        onChange={(e) => handleStatusChange(m.id, e.target.value)}
                        className="input text-xs pr-8 py-1.5"
                      >
                        {options.map((s) => (
                          <option key={s} value={s}>
                            {lbl("machineStatus", s)}
                          </option>
                        ))}
                      </select>
                      {isPending && (
                        <span className="absolute right-8 top-1.5 flex h-4 w-4 items-center justify-center">
                          <Loader2 className="animate-spin text-[#7c3aed]" size={12} />
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <Link
                        href={`/machines/${m.id}/edit`}
                        className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <Edit2 size={12} />
                        {isEn ? "Edit" : "সম্পাদনা"}
                      </Link>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 disabled:opacity-50"
                        disabled={isPending}
                      >
                        <Trash2 size={12} />
                        {isEn ? "Delete" : "মুছুন"}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== টুলস ও অন্যান্য উপকরণ সেকশন ==================== */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Cog className="text-[#6366f1]" size={20} />
            {isEn ? "Tools & Other Materials" : "টুলস ও অন্যান্য উপকরণ"}
          </h2>
          <Link
            href="/machines/new"
            className="btn bg-[#6366f1] text-white hover:bg-indigo-700 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5"
          >
            <Plus size={14} />
            {isEn ? "Add Equipment" : "নতুন সরঞ্জাম"}
          </Link>
        </div>

        {/* উপকরণ তালিকা টেবিল (কোনো কার্ড থাকবে না) */}
        {materials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center text-xs text-gray-500">
            {isEn ? "No materials found" : "কোনো উপকরণ পাওয়া যায়নি"}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                    <th className="px-4 py-3">{isEn ? "Name" : "নাম"}</th>
                    <th className="px-4 py-3 text-right">{isEn ? "Quantity" : "পরিমাণ"}</th>
                    <th className="px-4 py-3 text-center">{isEn ? "Date" : "তারিখ"}</th>
                    <th className="px-4 py-3 text-center">{isEn ? "Actions" : "অ্যাকশন"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {materials.map((m) => {
                    const isPending = pendingMap[m.id] || false;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-semibold text-gray-900">{m.name}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {m.capacityPerHr !== null && m.capacityPerHr !== undefined
                            ? formatNumber(m.capacityPerHr, lang)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-center">
                          {formatDate(m.createdAt, lang)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-4">
                            <Link
                              href={`/machines/${m.id}/edit`}
                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              <Edit2 size={12} />
                              {isEn ? "Edit" : "সম্পাদনা"}
                            </Link>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 disabled:opacity-50"
                              disabled={isPending}
                            >
                              <Trash2 size={12} />
                              {isEn ? "Delete" : "মুছুন"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
