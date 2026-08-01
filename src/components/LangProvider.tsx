"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { t as translate, lbl as label, type Locale, labelMaps } from "@/lib/i18n";

type Ctx = {
  lang: Locale;
  t: (key: string) => string;
  lbl: (map: keyof typeof labelMaps, key: string) => string;
  setLang: (l: Locale) => void;
};

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({
  lang: initial,
  children,
}: {
  lang: Locale;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Locale>(initial);

  const setLang = useCallback((l: Locale) => {
    setLangState(l);
    document.cookie = `lang=${l};path=/;max-age=${60 * 60 * 24 * 365}`;
    // সার্ভার কম্পোনেন্ট রি-রেন্ডারের জন্য রিফ্রেশ
    window.location.reload();
  }, []);

  const value: Ctx = {
    lang,
    t: (key) => translate(lang, key),
    lbl: (map, key) => label(map, key, lang),
    setLang,
  };

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // ফলব্যাক (provider বাইরে)
    return {
      lang: "bn",
      t: (k) => translate("bn", k),
      lbl: (m, k) => label(m, k, "bn"),
      setLang: () => {},
    };
  }
  return ctx;
}
