"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/card";
import { Loader2, TrendingUp, TrendingDown, Target, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
  colorClass?: string;
}

function KpiCard({ label, value, sub, icon, colorClass }: KpiCardProps) {
  return (
    <Card className="flex-1 min-w-0">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-[10px] text-text-tertiary uppercase tracking-[0.14em]">{label}</p>
          {icon && <span className={`${colorClass ?? "text-text-tertiary"}`}>{icon}</span>}
        </div>
        <p className={`text-xl font-semibold font-tabular ${colorClass ?? "text-text-primary"}`}>
          {value}
        </p>
        {sub && <p className="text-[11px] text-text-tertiary mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function ShadowKpiRow() {
  const { data: stats, isLoading } = trpc.shadow.getStats.useQuery();

  if (isLoading) {
    return (
      <div className="flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="flex-1">
            <CardContent className="p-4 flex items-center justify-center h-20">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const accuracy = stats?.accuracyRate != null ? `${stats.accuracyRate}%` : "—";
  const bestCall = stats?.bestCall?.symbol
    ? `${stats.bestCall.symbol} ${stats.bestCall.pct >= 0 ? "+" : ""}${stats.bestCall.pct.toFixed(1)}%`
    : "—";
  const biggestMiss = stats?.biggestMiss?.symbol
    ? `${stats.biggestMiss.symbol} ${stats.biggestMiss.pct.toFixed(1)}%`
    : "—";

  return (
    <div className="flex gap-3">
      <KpiCard
        label="Open Cases"
        value={stats?.open ?? 0}
        icon={<Clock className="h-4 w-4" />}
      />
      <KpiCard
        label="Awaiting Review"
        value={stats?.awaitingReview ?? 0}
        icon={<AlertTriangle className="h-4 w-4" />}
        colorClass={(stats?.awaitingReview ?? 0) > 0 ? "text-[color:var(--warning)]" : undefined}
      />
      <KpiCard
        label="Accuracy"
        value={accuracy}
        sub={stats?.reviewed ? `${stats.reviewed} reviewed` : undefined}
        icon={<Target className="h-4 w-4" />}
        colorClass={
          stats?.accuracyRate != null
            ? stats.accuracyRate >= 55 ? "text-[color:var(--positive)]" : stats.accuracyRate >= 40 ? "text-[color:var(--warning)]" : "text-[color:var(--negative)]"
            : undefined
        }
      />
      <KpiCard
        label="Best Call"
        value={bestCall}
        icon={<TrendingUp className="h-4 w-4" />}
        colorClass="text-[color:var(--positive)]"
      />
      <KpiCard
        label="Biggest Miss"
        value={biggestMiss}
        icon={<TrendingDown className="h-4 w-4" />}
        colorClass={stats?.biggestMiss ? "text-[color:var(--negative)]" : undefined}
      />
    </div>
  );
}
