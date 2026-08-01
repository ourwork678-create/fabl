"use client";

import { SessionProvider } from "next-auth/react";
import { LangProvider } from "@/components/LangProvider";
import type { Locale } from "@/lib/i18n";

export function Providers({
  lang,
  children,
}: {
  lang: Locale;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <LangProvider lang={lang}>{children}</LangProvider>
    </SessionProvider>
  );
}
