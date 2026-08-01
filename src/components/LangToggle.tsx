"use client";

import { useLang } from "@/components/LangProvider";
import { Globe } from "lucide-react";

export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === "bn" ? "en" : "bn")}
      className="btn-ghost text-sm"
      title={lang === "bn" ? "Switch to English" : "বাংলায় চলুন"}
    >
      <Globe size={16} />
      {compact ? (lang === "bn" ? "EN" : "বাং") : lang === "bn" ? "English" : "বাংলা"}
    </button>
  );
}
