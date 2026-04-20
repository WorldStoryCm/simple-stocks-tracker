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
    <Card className="flex-1">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          {icon && <span className={`${colorClass ?? "text-muted-foreground"}`}>{icon}</span>}
        </div>
        <p className={`text-2xl font-bold tabular-nums ${colorClass ?? "text-foreground"}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
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
        colorClass={(stats?.awaitingReview ?? 0) > 0 ? "text-warning" : undefined}
      />
      <KpiCard
        label="Accuracy"
        value={accuracy}
        sub={stats?.reviewed ? `${stats.reviewed} reviewed` : undefined}
        icon={<Target className="h-4 w-4" />}
        colorClass={
          stats?.accuracyRate != null
            ? stats.accuracyRate >= 55 ? "text-green-500" : stats.accuracyRate >= 40 ? "text-warning" : "text-destructive"
            : undefined
        }
      />
      <KpiCard
        label="Best Call"
        value={bestCall}
        icon={<TrendingUp className="h-4 w-4" />}
        colorClass="text-green-500"
      />
      <KpiCard
        label="Biggest Miss"
        value={biggestMiss}
        icon={<TrendingDown className="h-4 w-4" />}
        colorClass={stats?.biggestMiss ? "text-red-500" : undefined}
      />
    </div>
  );
}
