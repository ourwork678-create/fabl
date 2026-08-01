"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="btn-primary no-print print:hidden"
    >
      <Printer size={16} /> {label}
    </button>
  );
}
