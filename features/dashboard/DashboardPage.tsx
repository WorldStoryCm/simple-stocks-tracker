"use client";

import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Loader2, Target, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { Progress } from "@/components/progress";
import { CapitalProgressCard } from "@/features/dashboard/CapitalProgressCard";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a28bfe', '#ff7675', '#fdcb6e', '#e17055', '#d63031', '#e84393'];

const GOAL_LABELS: Record<string, { label: string; period: string }> = {
  monthly_profit: { label: "Monthly Goal", period: "this month" },
  yearly_profit: { label: "Yearly Goal", period: "this year" },
};

function GoalProgressCard({ goal }: { goal: { goalType: string; target: number; current: number } }) {
  const meta = GOAL_LABELS[goal.goalType] ?? { label: goal.goalType, period: "" };
  const pct = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
  const remaining = goal.target - goal.current;
  const isAhead = goal.current >= goal.target;
  const isNegative = goal.current < 0;

  return (
    <Card className="flex flex-col gap-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Target className="h-4 w-4" />
            {meta.label}
          </CardTitle>
          {isAhead ? (
            <span className="text-xs font-semibold text-green-500 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> On target
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${isNegative ? "text-red-500" : isAhead ? "text-green-500" : ""}`}>
            {goal.current >= 0 ? "+" : ""}${goal.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-sm text-muted-foreground">
            / ${goal.target.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </span>
        </div>

        <Progress
          value={Math.max(0, pct)}
          className="h-2"
        />

        <p className="text-xs text-muted-foreground">
          {isAhead
            ? `$${Math.abs(goal.current - goal.target).toLocaleString(undefined, { minimumFractionDigits: 2 })} above target ${meta.period}`
            : isNegative
            ? `${meta.period} P/L is negative`
            : `$${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} remaining ${meta.period}`
          }
        </p>
      </CardContent>
    </Card>
  );
}

const SECTOR_CONCENTRATION_THRESHOLD = 0.4; // 40% triggers the warning

// Curated palette chosen for readability on both light and dark backgrounds.
// Distinct enough that 8+ sectors are still easy to tell apart.
const SECTOR_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
  '#06b6d4', // cyan-500
  '#a855f7', // purple-500
  '#ef4444', // red-500
];
const UNCLASSIFIED_COLOR = '#94a3b8'; // slate-400 — soft, clearly neutral, not "heavy"

function SectorBreakdownCard({ data, totalInvested }: { data?: { name: string; value: number }[]; totalInvested: number }) {
  const hasData = data && data.length > 0 && totalInvested > 0;
  const allUnclassified = hasData && data!.every(d => d.name === "Unclassified");
  const topSlice = hasData ? data[0] : null;
  const topShare = topSlice && totalInvested > 0 ? topSlice.value / totalInvested : 0;
  const overConcentrated = !allUnclassified && topShare >= SECTOR_CONCENTRATION_THRESHOLD;
  const hasUnclassified = hasData && !allUnclassified && data!.some(d => d.name === "Unclassified");

  // Assign colors skipping the Unclassified slot so classified sectors keep their
  // palette positions stable.
  let paletteIdx = 0;
  const coloredData = hasData ? data!.map((entry) => {
    if (entry.name === "Unclassified") {
      return { ...entry, _fill: UNCLASSIFIED_COLOR };
    }
    const fill = SECTOR_COLORS[paletteIdx % SECTOR_COLORS.length];
    paletteIdx++;
    return { ...entry, _fill: fill };
  }) : [];

  const showEmptyState = !hasData || allUnclassified;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Capital by Sector</CardTitle>
          {overConcentrated && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">
              <AlertTriangle className="h-3 w-3" /> {(topShare * 100).toFixed(0)}% in {topSlice!.name}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="h-[300px]">
        {showEmptyState ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-4">
            <div className="text-sm text-muted-foreground">
              {allUnclassified ? "No sector metadata yet." : "No active investments."}
            </div>
            {allUnclassified && (
              <div className="text-xs text-muted-foreground">
                Open <span className="font-medium text-foreground">Symbols → Refresh metadata</span> to pull sectors from Yahoo.
              </div>
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={coloredData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                label={(props: any) => `${((props.value / totalInvested) * 100).toFixed(0)}%`}
              >
                {coloredData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry._fill} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(val: any, _name: any, entry: any) => {
                  const pct = totalInvested > 0 ? (Number(val) / totalInvested) * 100 : 0;
                  return [`$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })} (${pct.toFixed(1)}%)`, entry?.payload?.name];
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
      {hasUnclassified && (
        <div className="px-6 pb-4 -mt-2 text-xs text-muted-foreground">
          Some symbols lack sector metadata. Refresh from /symbols.
        </div>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const { data: session } = useSession();
  const { data: perf, isLoading } = trpc.performance.stats.useQuery();

  const renderStatsList = (dataObj: any) => {
    if (!dataObj || !dataObj.data || dataObj.data.length === 0) {
      return (
        <div className="text-muted-foreground text-sm italic py-4">
          No realized matching data yet. Add Sell trades to see realized performance.
        </div>
      );
    }

    // Reverse so most recent is at top
    const reversed = [...dataObj.data].reverse();

    return (
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between text-sm pb-3 border-b border-border/50 bg-muted/30 p-2 rounded-lg">
          <span className="text-muted-foreground">Avg: <span className={dataObj.average >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>${dataObj.average.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
          <span className="text-muted-foreground">Min: <span className={dataObj.min >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>${dataObj.min.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
          <span className="text-muted-foreground">Max: <span className={dataObj.max >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>${dataObj.max.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
        </div>
        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 px-1">
          {reversed.map((m: any, i: number) => (
            <div
              key={i}
              className={`flex items-center justify-between rounded-md px-3 py-2 ${
                m.pnl === 0
                  ? "opacity-40"
                  : m.pnl > 0
                  ? "bg-green-500/5 hover:bg-green-500/10"
                  : "bg-red-500/5 hover:bg-red-500/10"
              } transition-colors`}
            >
              <div className="flex items-center gap-2">
                {m.pnl > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                ) : m.pnl < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="font-medium">{m.period}</span>
              </div>
              <div className={`font-bold tabular-nums ${m.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {m.pnl >= 0 ? "+" : ""}${m.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasGoals = (perf?.goalProgress?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6 animate-stagger-in">
      <h1 className="text-3xl font-bold">Welcome back, {session?.user?.name?.split(' ')[0] || "Trader"}</h1>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground w-8 h-8" /></div>
      ) : (
        <>
          {perf?.capitalProgress ? <CapitalProgressCard progress={perf.capitalProgress} /> : null}

          {/* Top stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Invested Capital</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(perf?.totalInvested || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Realized P/L</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(perf?.totalRealizedPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(perf?.totalRealizedPnl || 0) >= 0 ? '+' : ''}${(perf?.totalRealizedPnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goal Progress */}
          {hasGoals && (
            <div>
              <h2 className="text-base font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" /> Profit Goals
              </h2>
              <div className={`grid gap-4 ${perf!.goalProgress.length === 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}>
                {perf!.goalProgress.map((g: any) => (
                  <GoalProgressCard key={g.goalType} goal={g} />
                ))}
              </div>
            </div>
          )}

          {/* Pie charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capital by Platform</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {perf?.investedPerPlatform?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={perf.investedPerPlatform} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={(props: any) => `$${Number(props.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                        {perf.investedPerPlatform.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No active investments</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capital by Bucket</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {perf?.investedPerBucket?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={perf.investedPerBucket} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={(props: any) => `$${Number(props.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                        {perf.investedPerBucket.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No active investments</div>}
              </CardContent>
            </Card>

            <SectorBreakdownCard data={perf?.investedPerSector} totalInvested={perf?.totalInvested || 0} />
          </div>

          {/* Performance Logs */}
          <Card>
            <CardHeader className="pb-4 border-b">
              <CardTitle>Performance Logs</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="daily" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
                <TabsContent value="daily">
                  {renderStatsList(perf?.dailyStats)}
                </TabsContent>
                <TabsContent value="weekly">
                  {renderStatsList(perf?.weeklyStats)}
                </TabsContent>
                <TabsContent value="monthly">
                  {renderStatsList(perf?.monthlyStats)}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
