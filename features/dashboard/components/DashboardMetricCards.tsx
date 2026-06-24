"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { cn } from "@/components/component.utils";
import { formatAmount } from "@/lib/currency";
import { fmtMoney, fmtPct } from "../lib/format";

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  loading,
}: {
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  loading?: boolean;
}) {
  const isPositive = value >= 0;
  return (
    <Card loading={loading} className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-5">
        <span className="text-xs uppercase tracking-[0.12em] text-text-tertiary">{label}</span>
        <span
          className={cn(
            "font-tabular text-[28px] font-semibold tracking-tight",
            isPositive ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
          )}
        >
          {fmtMoney(value)}
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 font-tabular text-[11px] font-medium",
              delta >= 0
                ? "bg-[color:var(--positive-soft)] text-[color:var(--positive)]"
                : "bg-[color:var(--negative-soft)] text-[color:var(--negative)]",
            )}
          >
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {fmtPct(delta)}
            {deltaLabel && <span className="font-normal text-text-tertiary">{deltaLabel}</span>}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

export function FreeCashCard({
  value,
  currencyCode,
  loading,
}: {
  value: number;
  currencyCode: string;
  loading?: boolean;
}) {
  return (
    <Card loading={loading} className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-5">
        <span className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Free Cash</span>
        <span className="font-tabular text-[28px] font-semibold tracking-tight text-text-primary">
          {formatAmount(value, currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
        <span className="text-[11px] text-text-tertiary">Unspent across active platforms</span>
      </CardContent>
    </Card>
  );
}

export function CapitalGoalCard({
  current,
  target,
  currencyCode,
  loading,
}: {
  current: number;
  target: number;
  currencyCode: string;
  loading?: boolean;
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <Card loading={loading} className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-5">
        <span className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Capital Goal</span>
        <div className="flex items-baseline gap-2">
          <span className="font-tabular text-[28px] font-semibold tracking-tight text-text-primary">
            {formatAmount(current, currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="font-tabular text-xs text-text-tertiary">
            / {formatAmount(target, currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]">
          <div
            className="h-full rounded-full [background-image:linear-gradient(90deg,var(--brand-from),var(--positive))] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-tabular text-[11px] text-text-tertiary">{pct.toFixed(1)}% toward target</span>
      </CardContent>
    </Card>
  );
}

function GoalRow({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = Math.max(target - current, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xs uppercase tracking-wide text-text-tertiary">{label}</span>
          <span className="font-tabular text-xs text-text-tertiary">
            ${target.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="font-tabular text-base font-semibold tracking-tight text-[color:var(--positive)]">
          {fmtMoney(current, false)}
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]">
        <div
          className="h-full rounded-full [background-image:linear-gradient(90deg,var(--brand-from),var(--positive))] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <span>${remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })} to go</span>
        <span className="font-tabular">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

export function GoalsCard({
  monthly,
  yearly,
  loading,
}: {
  monthly: { current: number; target: number };
  yearly: { current: number; target: number };
  loading?: boolean;
}) {
  return (
    <Card loading={loading} className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">Goals</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <GoalRow label="Monthly" current={monthly.current} target={monthly.target} />
        <GoalRow label="Yearly" current={yearly.current} target={yearly.target} />
      </CardContent>
    </Card>
  );
}
