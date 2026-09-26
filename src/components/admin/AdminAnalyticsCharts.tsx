import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatINR,
  policyDistributionData,
  salesOverviewDatasets,
  type SalesDataPoint,
} from "./admin-mock-data";

export interface AdminAnalyticsChartsProps {
  initialTimeframe?: "7D" | "30D" | "6M" | "1Y";
}

export function AdminAnalyticsCharts({ initialTimeframe = "30D" }: AdminAnalyticsChartsProps) {
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "6M" | "1Y">(initialTimeframe);
  const chartData: SalesDataPoint[] = salesOverviewDatasets[timeframe];

  const totalSoldInPeriod = chartData.reduce((acc, curr) => acc + curr.policiesSold, 0);
  const totalPremiumInPeriod = chartData.reduce((acc, curr) => acc + curr.premiumAmount, 0);

  return (
    <section aria-label="Analytics Overview" className="w-full">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Policy Sales Overview Area/Line Chart */}
        <div className="rounded-2xl border border-border/80 bg-background/90 p-5 shadow-xs backdrop-blur-sm lg:col-span-2 flex flex-col justify-between">
          {/* Header & Timeframe Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                Policy Sales Overview
              </h2>
              <p className="text-xs text-muted-foreground">
                Volume of new policies issued and gross premium collected over time
              </p>
            </div>

            {/* Timeframe Filter Buttons */}
            <div
              role="group"
              aria-label="Timeframe selection"
              className="flex items-center rounded-xl border border-border bg-surface/60 p-1"
            >
              {(
                [
                  { id: "7D", label: "7 Days" },
                  { id: "30D", label: "30 Days" },
                  { id: "6M", label: "6 Months" },
                  { id: "1Y", label: "1 Year" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeframe(tab.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    timeframe === tab.id
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Key Metric Highlights in chart */}
          <div className="my-4 flex items-center gap-6 text-xs">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">Period Volume:</span>
              <p className="font-display font-extrabold text-foreground text-base">
                {totalSoldInPeriod.toLocaleString("en-IN")} Policies
              </p>
            </div>
            <div className="h-7 w-px bg-border" />
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">
                Period Gross Premium:
              </span>
              <p className="font-display font-extrabold text-primary text-base">
                {formatINR(totalPremiumInPeriod)}
              </p>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="policySoldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  opacity={0.08}
                />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length && payload[0]) {
                      const data = payload[0].payload as SalesDataPoint;
                      return (
                        <div className="rounded-xl border border-border bg-background p-3 shadow-lg text-xs">
                          <p className="font-bold text-foreground mb-1">{label}</p>
                          <div className="flex items-center gap-2 text-primary font-semibold">
                            <span className="size-2 rounded-full bg-primary" />
                            <span>Policies Sold: {data.policiesSold}</span>
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            Premium:{" "}
                            <span className="font-medium text-foreground">
                              {formatINR(data.premiumAmount)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="policiesSold"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#policySoldGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Policy Distribution Donut Chart */}
        <div className="rounded-2xl border border-border/80 bg-background/90 p-5 shadow-xs backdrop-blur-sm flex flex-col justify-between">
          <div className="border-b border-border/60 pb-3">
            <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
              Policy Distribution
            </h2>
            <p className="text-xs text-muted-foreground">
              Underwritten portfolio distribution by category
            </p>
          </div>

          {/* Donut Chart */}
          <div className="relative h-56 w-full flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={policyDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {policyDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length && payload[0]) {
                      const item = payload[0].payload as (typeof policyDistributionData)[0];
                      return (
                        <div className="rounded-xl border border-border bg-background p-2.5 shadow-md text-xs">
                          <p className="font-bold text-foreground">{item.name}</p>
                          <p className="text-muted-foreground">
                            Share:{" "}
                            <span className="font-semibold text-foreground">{item.value}%</span> (
                            {item.count} policies)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-muted-foreground font-medium">Catalog Total</span>
              <span className="font-display text-xl font-extrabold text-foreground">1,248</span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            {policyDistributionData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-muted-foreground">
                  <span>{item.percentage}</span>
                  <span className="text-[11px] text-muted-foreground/70">({item.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
