import type { Metadata, Viewport } from "next";
import { Inter, Hind_Siliguri } from "next/font/google";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import type { Locale } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bangla = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-bangla",
  display: "swap",
});

const bornomala = localFont({
  src: [
    {
      path: "../../public/fonts/Bornomala-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Bornomala-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-bornomala",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nishat Auto Rice Mill — রাইস মিল ব্যবস্থাপনা",
  description: "অটো রাইস মিল ফ্যাক্টরি ব্যবস্থাপনা সফটওয়্যার",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang: Locale = cookies().get("lang")?.value === "en" ? "en" : "bn";

  return (
    <html lang={lang === "en" ? "en" : "bn"} className={`${inter.variable} ${bangla.variable} ${bornomala.variable}`}>
      <body className="font-sans">
        <Providers lang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
