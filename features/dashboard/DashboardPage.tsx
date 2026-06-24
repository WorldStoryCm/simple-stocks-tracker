"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { CapitalGoalCard, FreeCashCard, GoalsCard, KpiCard } from "./components/DashboardMetricCards";
import { CumulativeChartCard } from "./components/CumulativeChartCard";
import { DashboardFilterRow } from "./components/DashboardFilterRow";
import { MoversList } from "./components/MoversList";
import { PlatformsSummaryCard } from "./components/PlatformsSummaryCard";
import { ProfitLossBySymbolCard } from "./components/ProfitLossBySymbolCard";
import { RecentTradesCard } from "./components/RecentTradesCard";
import type { DashboardFilters, DashboardMover, DashboardPlatform, DashboardSymbol } from "./types";

type DashboardPosition = {
  realizedPnl: string | number;
  totalCost: string | number;
  symbol?: { ticker?: string | null } | null;
};

function buildMovers(positions: DashboardPosition[]): {
  gainers: DashboardMover[];
  losers: DashboardMover[];
} {
  const list = positions
    .filter((position) => Number(position.realizedPnl) !== 0)
    .map((position) => {
      const pnl = Number(position.realizedPnl);
      const cost = Number(position.totalCost) || 1;
      return {
        ticker: position.symbol?.ticker ?? "-",
        pnl,
        pct: (pnl / cost) * 100,
      };
    });
  const sortedDesc = [...list].sort((a, b) => b.pnl - a.pnl);

  return {
    gainers: sortedDesc.filter((row) => row.pnl > 0).slice(0, 5),
    losers: sortedDesc
      .filter((row) => row.pnl < 0)
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, 5),
  };
}

export function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({});

  const { data: platformsList } = trpc.platforms.list.useQuery();
  const { data: symbolsList } = trpc.symbols.list.useQuery();
  const queryFilters = useMemo(() => ({ filters }), [filters]);
  const { data: perf, isLoading: perfLoading } = trpc.performance.stats.useQuery(queryFilters);
  const { data: positions, isLoading: positionsLoading } = trpc.positions.list.useQuery(queryFilters);

  const monthPnl = useMemo(() => {
    const data = perf?.monthlyStats?.data;
    return data && data.length > 0 ? data[data.length - 1].pnl : 0;
  }, [perf]);

  const allTimePnl = perf?.totalRealizedPnl ?? 0;
  const monthlyGoal = perf?.goalProgress?.find((goal) => goal.goalType === "monthly_profit");
  const yearlyGoal = perf?.goalProgress?.find((goal) => goal.goalType === "yearly_profit");
  const movers = useMemo(
    () => buildMovers(((positions ?? []) as DashboardPosition[])),
    [positions],
  );

  return (
    <div className="flex flex-col gap-6 animate-stagger-in">
      <DashboardFilterRow
        filters={filters}
        setFilters={setFilters}
        platforms={(platformsList ?? []) as DashboardPlatform[]}
        symbols={(symbolsList ?? []) as DashboardSymbol[]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <FreeCashCard
          value={perf?.capitalProgress?.cashAmount ?? 0}
          currencyCode={perf?.capitalProgress?.currencyCode ?? "EUR"}
          loading={perfLoading}
        />
        <CapitalGoalCard
          current={perf?.capitalProgress?.totalAmount ?? 0}
          target={perf?.capitalProgress?.targetAmount ?? 0}
          currencyCode={perf?.capitalProgress?.currencyCode ?? "EUR"}
          loading={perfLoading}
        />
        <KpiCard label="Month P/L" value={monthPnl} delta={9.22} loading={perfLoading} />
        <KpiCard label="All-time P/L" value={allTimePnl} delta={29.76} loading={perfLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GoalsCard
          monthly={{ current: monthlyGoal?.current ?? monthPnl, target: monthlyGoal?.target ?? 2500 }}
          yearly={{ current: yearlyGoal?.current ?? allTimePnl, target: yearlyGoal?.target ?? 30000 }}
          loading={perfLoading}
        />
        <CumulativeChartCard data={perf?.portfolioStats ?? []} loading={perfLoading} />
      </div>

      <PlatformsSummaryCard data={perf?.investedPerPlatform ?? []} loading={perfLoading} />
      <ProfitLossBySymbolCard filters={filters} />
      <RecentTradesCard filters={filters} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MoversList title="Top Gainers" rows={movers.gainers} positive loading={positionsLoading} />
        <MoversList title="Top Losers" rows={movers.losers} positive={false} loading={positionsLoading} />
      </div>
    </div>
  );
}
