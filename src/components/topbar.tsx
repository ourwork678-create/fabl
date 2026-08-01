"use client";

import { LangToggle } from "@/components/LangToggle";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 hidden items-center justify-end gap-3 border-b border-gray-200 bg-white/80 px-6 py-3 backdrop-blur lg:flex">
      <LangToggle />
    </header>
  );
}
