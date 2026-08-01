"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatTaka } from "@/lib/utils";
import { useLang } from "@/components/LangProvider";
import { TrendingUp, ArrowDownRight, ArrowUpRight } from "lucide-react";

export type ChartDataItem = {
  month: string;
  sales: number;
  purchases: number;
};

type Props = {
  data: ChartDataItem[];
  isDemo?: boolean;
};

export function DashboardChart({ data, isDemo = false }: Props) {
  const { t, lang } = useLang();

  const isEn = lang === "en";

  // ড্যাশবোর্ড চার্ট ফিলিং - ধারাবাহিক ৬ মাস বজায় রেখে ডেটা প্রদর্শন
  const chartData = (data && data.length > 0 ? data : []).map((item, idx) => {
    if (isDemo && item.sales === 0 && item.purchases === 0) {
      // ডেমো মোডে হালকা ডামি মান দিয়ে চার্ট স্মুথ রাখা
      const demoSales = [45000, 52000, 49000, 63000, 58000, 71000];
      const demoPurchases = [32000, 41000, 38000, 45000, 42000, 52000];
      return {
        ...item,
        sales: demoSales[idx % 6],
        purchases: demoPurchases[idx % 6],
      };
    }
    return item;
  });

  // সারাংশ সবসময় আসল ডেটা থেকে — ডেমো মান শুধু চার্টের রেখা স্মুথ রাখতে,
  // আর্থিক সংখ্যায় (মোট বিক্রয়/ক্রয়/মার্জিন) কখনো ঢুকবে না
  const realData = data && data.length > 0 ? data : [];
  const totalSales = realData.reduce((sum, item) => sum + item.sales, 0);
  const totalPurchases = realData.reduce((sum, item) => sum + item.purchases, 0);
  const netProfit = totalSales - totalPurchases;

  return (
    <div className="card p-6 col-span-2 lg:col-span-3">
      {/* চার্ট হেডার */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-base lg:text-lg">
              {isEn ? "Sales & Purchases Analysis" : "ক্রয় ও বিক্রয় বিশ্লেষণ"}
            </h3>
            {(isDemo || (!data || data.length === 0)) && (
              <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
                {isEn ? "Demo Data" : "ডেমো ডেটা"}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {isEn ? "Monthly financial cashflow overview" : "মাসিক আর্থিক লেনদেনের চিত্র"}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-[#10b981]" />
            <span className="text-gray-600">{isEn ? "Sales" : "বিক্রয়"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-[#6366f1]" />
            <span className="text-gray-600">{isEn ? "Purchases" : "ক্রয়"}</span>
          </div>
        </div>
      </div>

      {/* চার্ট ও সাইড প্যানেল */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* রেডি চার্ট এরিয়া */}
        <div className="h-[280px] lg:col-span-7 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${val / 1000}k` : val)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg">
                        <p className="mb-1 text-xs font-semibold text-slate-800">
                          {payload[0].payload.month}
                        </p>
                        <div className="space-y-1 text-xs">
                          <p className="text-[#10b981] flex items-center gap-1.5 font-semibold">
                            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                            {isEn ? "Sales" : "বিক্রয়"}: {formatTaka(payload[0].value as number, lang)}
                          </p>
                          <p className="text-[#6366f1] flex items-center gap-1.5 font-medium">
                            <span className="h-2 w-2 rounded-full bg-[#6366f1]" />
                            {isEn ? "Purchases" : "ক্রয়"}: {formatTaka(payload[1].value as number, lang)}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorSales)"
              />
              <Area
                type="monotone"
                dataKey="purchases"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPurchases)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ডানদিকের সাইড প্যানেল (ইনফো) */}
        <div className="lg:col-span-5 flex flex-col justify-center gap-4 lg:border-l lg:border-slate-100 lg:pl-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              {isEn ? "Summary Overview" : "আর্থিক সারসংক্ষেপ"}
            </p>
            <p className="text-[11px] text-slate-400">
              {isEn ? "Past 4 months & current month" : "বিগত ৪ মাস ও চলতি মাস"}
            </p>
          </div>

          <div className="space-y-3">
            {/* ইনকামিং / বিক্রয় */}
            <div className="rounded-xl bg-slate-50/50 p-3 border border-slate-100/50">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
                <span>{isEn ? "Incoming" : "মোট বিক্রয় (জমা)"}</span>
                <ArrowUpRight size={14} className="text-emerald-500" />
              </div>
              <p className="font-bold text-gray-900 text-sm xl:text-base">
                {formatTaka(totalSales, lang)}
              </p>
            </div>

            {/* আউটগোয়িং / ক্রয় */}
            <div className="rounded-xl bg-slate-50/50 p-3 border border-slate-100/50">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
                <span>{isEn ? "Outgoing" : "মোট ক্রয় (খরচ)"}</span>
                <ArrowDownRight size={14} className="text-red-500" />
              </div>
              <p className="font-bold text-gray-900 text-sm xl:text-base">
                {formatTaka(totalPurchases, lang)}
              </p>
            </div>

            {/* গ্রস মার্জিন (বিক্রয় - ক্রয়) */}
            <div className="rounded-xl bg-purple-50/30 p-3 border border-purple-100/20">
              <div className="flex items-center justify-between text-xs text-purple-700/80 mb-0.5">
                <span>{isEn ? "Gross Margin (Sales - Purchases)" : "গ্রস মার্জিন (বিক্রয় - ক্রয়)"}</span>
                <TrendingUp size={14} className="text-purple-600" />
              </div>
              <p className="font-bold text-[#7c3aed] text-base xl:text-lg">
                {formatTaka(netProfit, lang)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
