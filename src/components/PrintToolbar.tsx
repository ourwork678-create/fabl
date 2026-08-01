"use client";

import { Printer, X } from "lucide-react";

export function PrintToolbar() {
  return (
    <div className="no-print print:hidden mb-6 flex justify-between items-center bg-gray-100 p-4 rounded-xl shadow-sm border border-gray-200">
      <span className="text-sm font-medium text-gray-700">
        Print Preview — Nishat Auto Rice Mill
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => window.print()}
          className="btn-primary py-1.5 px-3 flex items-center gap-1.5 text-xs"
        >
          <Printer size={14} /> প্রিন্ট (Print)
        </button>
        <button
          onClick={() => window.close()}
          className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 text-xs"
        >
          <X size={14} /> বন্ধ করুন (Close)
        </button>
      </div>
    </div>
  );
}
