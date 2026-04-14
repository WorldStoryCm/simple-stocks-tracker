"use client";

import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import {
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";

const GREEN  = "hsl(142, 71%, 45%)";
const BLUE   = "hsl(217, 91%, 60%)";
const INDIGO = "hsl(239, 84%, 67%)";
const RED = "hsl(0, 84%, 60%)";
const ZERO_LINE = "hsl(220, 9%, 46%)";
const CUMULATIVE_LINE = "hsl(217, 91%, 60%)";

function buildCumulative(data: { period: string; pnl: number }[]) {
  let running = 0;
  return data.map((d) => {
    running += d.pnl;
    return { ...d, cumulative: running };
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const pnl = payload.find((p: any) => p.dataKey === "pnl")?.value ?? 0;
  const cum = payload.find((p: any) => p.dataKey === "cumulative")?.value;
  return (
    <div className="rounded-lg border bg-card shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-muted-foreground mb-1">{label}</p>
      <p className={`font-bold ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
        P/L: ${Number(pnl).toFixed(2)}
      </p>
      {cum !== undefined && (
        <p className="text-blue-400 text-xs mt-0.5">
          Cumulative: ${Number(cum).toFixed(2)}
        </p>
      )}
    </div>
  );
};

const PortfolioTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const invested = payload.find((p: any) => p.dataKey === "netInvested")?.value ?? 0;
  const pnl      = payload.find((p: any) => p.dataKey === "cumulativePnl")?.value ?? 0;
  const total    = invested + pnl;
  return (
    <div className="rounded-lg border bg-card shadow-lg px-3 py-2 text-sm min-w-[180px]">
      <p className="font-semibold text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Open positions</span>
          <span className="font-medium" style={{ color: INDIGO }}>${Number(invested).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Realized P/L</span>
          <span className="font-medium" style={{ color: pnl >= 0 ? GREEN : "hsl(0,84%,60%)" }}>
            {pnl >= 0 ? "+" : ""}${Number(pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-border/50 mt-1">
          <span className="font-semibold">Portfolio value</span>
          <span className="font-bold" style={{ color: BLUE }}>${Number(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
};

export function PerformancePage() {
  const { data: stats, isLoading } = trpc.performance.stats.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  const renderPortfolioChart = (data: any[] | undefined) => {
    if (!data || data.length === 0) {
      return (
        <Card className="col-span-full mt-4 border-0 shadow-none">
          <CardContent className="h-[420px] p-0">
            <div className="h-full flex items-center justify-center text-muted-foreground border-dashed border-2 rounded-md">
              No trade history yet. Record some buys and sells to see portfolio growth.
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="col-span-full mt-4 border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle>Portfolio Growth</CardTitle>
            <p className="text-sm text-muted-foreground">
              Open cost basis + cumulative realized P/L = portfolio book value
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm opacity-70" style={{ background: INDIGO }} />
              Open positions (cost basis)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm opacity-70" style={{ background: GREEN }} />
              Cumulative realized P/L
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-0.5 rounded" style={{ background: BLUE }} />
              Total portfolio value
            </span>
          </div>
        </CardHeader>
        <CardContent className="h-[420px] px-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={INDIGO} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={INDIGO} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={GREEN} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,9%,22%)" vertical={false} />
              <XAxis
                dataKey="period"
                stroke="hsl(220,9%,46%)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="hsl(220,9%,46%)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                width={60}
              />
              <Tooltip content={<PortfolioTooltip />} cursor={{ fill: "hsl(220,9%,22%,0.3)" }} />
              {/* Stacked areas: open positions at bottom, P/L on top */}
              <Area
                type="monotone"
                dataKey="netInvested"
                name="Open positions"
                stackId="portfolio"
                stroke={INDIGO}
                strokeWidth={1.5}
                fill="url(#investedGrad)"
              />
              <Area
                type="monotone"
                dataKey="cumulativePnl"
                name="Realized P/L"
                stackId="portfolio"
                stroke={GREEN}
                strokeWidth={1.5}
                fill="url(#pnlGrad)"
              />
              {/* Total value line on top of both areas */}
              <Line
                type="monotone"
                dataKey="totalValue"
                name="Portfolio value"
                stroke={BLUE}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: BLUE }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderChart = (title: string, dataObj: any) => {
    if (!dataObj || !dataObj.data || dataObj.data.length === 0) {
      return (
        <Card className="col-span-full mt-4 border-0 shadow-none">
          <CardContent className="h-[400px] p-0">
            <div className="h-full flex items-center justify-center text-muted-foreground border-dashed border-2 rounded-md">
              Not enough data available for the chart. Close some trades first.
            </div>
          </CardContent>
        </Card>
      );
    }

    const enriched = buildCumulative(dataObj.data);
    const hasAnyNonZero = enriched.some((d) => d.pnl !== 0);

    return (
      <Card className="col-span-full mt-4 border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle>{title} Performance</CardTitle>
            <div className="flex items-center gap-4 text-sm font-medium bg-muted/50 p-2 rounded-lg border">
              <span className="text-muted-foreground">
                Avg:{" "}
                <span className={dataObj.average >= 0 ? "text-green-500" : "text-red-500"}>
                  ${dataObj.average.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </span>
              <span className="text-muted-foreground">
                Min:{" "}
                <span className={dataObj.min >= 0 ? "text-green-500" : "text-red-500"}>
                  ${dataObj.min.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </span>
              <span className="text-muted-foreground">
                Max:{" "}
                <span className={dataObj.max >= 0 ? "text-green-500" : "text-red-500"}>
                  ${dataObj.max.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: GREEN }} />
              Profit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: RED }} />
              Loss
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-0.5 rounded" style={{ background: CUMULATIVE_LINE }} />
              Cumulative
            </span>
          </div>
        </CardHeader>
        <CardContent className="h-[400px] px-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={enriched} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,9%,22%)" vertical={false} />
              <XAxis
                dataKey="period"
                stroke={ZERO_LINE}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke={ZERO_LINE}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
                width={60}
              />
              <ReferenceLine y={0} stroke={ZERO_LINE} strokeDasharray="4 2" strokeWidth={1.5} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(220,9%,22%,0.4)" }} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={40}>
                {enriched.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.pnl >= 0 ? GREEN : RED}
                    opacity={entry.pnl === 0 ? 0.25 : 1}
                  />
                ))}
              </Bar>
              {hasAnyNonZero && (
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke={CUMULATIVE_LINE}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: CUMULATIVE_LINE }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Performance</h1>
        <p className="text-muted-foreground mt-1">Detailed history and analytics of your realized returns.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realized P/L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(stats?.totalRealizedPnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
              ${stats?.totalRealizedPnl.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across all closed trades</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-full mt-4">
        <CardContent className="pt-6">
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-4 sm:w-[520px]">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              {renderChart("Daily", stats?.dailyStats)}
            </TabsContent>
            <TabsContent value="weekly">
              {renderChart("Weekly", stats?.weeklyStats)}
            </TabsContent>
            <TabsContent value="monthly">
              {renderChart("Monthly", stats?.monthlyStats)}
            </TabsContent>
            <TabsContent value="portfolio">
              {renderPortfolioChart(stats?.portfolioStats)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
