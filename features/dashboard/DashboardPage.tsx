"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Button } from "@/components/button";
import { AddTradeButton } from "@/components/trades/AddTradeButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Input } from "@/components/input";
import {
  format as formatDate,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
} from "date-fns";
import {
  ChevronDown,
  Settings2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/components/component.utils";
import { brand, chart, status, surface, text } from "@/lib/ui/tokens";
import { formatAmount } from "@/lib/currency";

/* ---------------- helpers ---------------- */

function fmtMoney(value: number, withSign = true) {
  const sign = withSign ? (value > 0 ? "+" : value < 0 ? "−" : "") : "";
  const abs = Math.abs(value);
  return `${sign}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtPct(value: number) {
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function plClass(value: number) {
  if (value > 0) return "text-[color:var(--positive)]";
  if (value < 0) return "text-[color:var(--negative)]";
  return "text-text-secondary";
}

/* ---------------- filter chips ---------------- */

export type DashboardFilters = {
  platformId?: string;
  symbolId?: string;
  dateFrom?: string;
  dateTo?: string;
};

type FilterPillProps = {
  label: string;
  value?: string;
  active?: boolean;
  children?: React.ReactNode;
  onClear?: () => void;
};

function FilterPill({ label, value = "All", active, children, onClear }: FilterPillProps) {
  const trigger = (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-[color:var(--brand-from)]/40 bg-[color:var(--brand-from)]/10 text-text-primary"
          : "border-border bg-[color:var(--surface-1)] text-text-secondary hover:bg-[color:var(--surface-2)] hover:text-text-primary",
      )}
    >
      <span className="text-text-tertiary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
      {active && onClear ? (
        <span
          role="button"
          aria-label={`Clear ${label}`}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClear(); }}
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-[color:var(--surface-2)]"
        >
          <X className="h-3 w-3" />
        </span>
      ) : (
        <ChevronDown className="h-3 w-3 text-text-tertiary" />
      )}
    </button>
  );

  if (!children) return trigger;
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-0 shadow-lg border">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function ListPicker({
  options,
  selected,
  onSelect,
  searchable = true,
  placeholder = "Search...",
}: {
  options: { id: string; label: string }[];
  selected?: string;
  onSelect: (id: string | undefined) => void;
  searchable?: boolean;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => (q ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : options),
    [options, q],
  );
  return (
    <div className="flex flex-col">
      {searchable && (
        <div className="border-b px-2 py-1.5">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            className="h-8 border-0 bg-transparent text-sm focus-visible:ring-0 px-2"
          />
        </div>
      )}
      <div className="max-h-[260px] overflow-y-auto p-1">
        <button
          type="button"
          className={cn(
            "w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-[color:var(--surface-2)]",
            !selected && "bg-[color:var(--surface-2)]/60 font-medium",
          )}
          onClick={() => onSelect(undefined)}
        >
          All
        </button>
        {filtered.map((o) => (
          <button
            key={o.id}
            type="button"
            className={cn(
              "w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-[color:var(--surface-2)]",
              selected === o.id && "bg-[color:var(--surface-2)]/60 font-medium",
            )}
            onClick={() => onSelect(o.id)}
          >
            {o.label}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-3 text-center text-xs text-text-tertiary">No matches</div>
        )}
      </div>
    </div>
  );
}

const ISO = (d: Date) => formatDate(d, "yyyy-MM-dd");

const DATE_PRESETS: { key: string; label: string; short: string; range: () => [string, string] }[] = [
  {
    key: "this-month",
    label: "This month",
    short: "TM",
    range: () => { const n = new Date(); return [ISO(startOfMonth(n)), ISO(endOfMonth(n))]; },
  },
  {
    key: "last-month",
    label: "Last month",
    short: "LM",
    range: () => { const n = subMonths(new Date(), 1); return [ISO(startOfMonth(n)), ISO(endOfMonth(n))]; },
  },
  {
    key: "this-year",
    label: "This year",
    short: "TY",
    range: () => { const n = new Date(); return [ISO(startOfYear(n)), ISO(endOfYear(n))]; },
  },
  {
    key: "last-year",
    label: "Last year",
    short: "LY",
    range: () => { const n = subYears(new Date(), 1); return [ISO(startOfYear(n)), ISO(endOfYear(n))]; },
  },
];

function DateRangePicker({
  from,
  to,
  onApply,
  onClear,
}: {
  from?: string;
  to?: string;
  onApply: (from?: string, to?: string) => void;
  onClear: () => void;
}) {
  const [localFrom, setLocalFrom] = useState(from ?? "");
  const [localTo, setLocalTo] = useState(to ?? "");
  useEffect(() => { setLocalFrom(from ?? ""); setLocalTo(to ?? ""); }, [from, to]);

  const matchedPreset = DATE_PRESETS.find(p => {
    const [pf, pt] = p.range();
    return pf === localFrom && pt === localTo;
  })?.key;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="grid grid-cols-4 gap-1">
        {DATE_PRESETS.map((p) => {
          const active = matchedPreset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              title={p.label}
              aria-label={p.label}
              onClick={() => {
                const [f, t] = p.range();
                setLocalFrom(f);
                setLocalTo(t);
                onApply(f, t);
              }}
              className={cn(
                "h-8 rounded-md text-[11px] font-semibold tabular-nums transition-colors",
                active
                  ? "bg-[color:var(--brand-from)]/15 text-text-primary border border-[color:var(--brand-from)]/40"
                  : "border border-border bg-[color:var(--surface-1)] text-text-secondary hover:bg-[color:var(--surface-2)] hover:text-text-primary",
              )}
            >
              {p.short}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">From</label>
        <Input type="date" value={localFrom} onChange={(e) => setLocalFrom(e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">To</label>
        <Input type="date" value={localTo} onChange={(e) => setLocalTo(e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => { setLocalFrom(""); setLocalTo(""); onClear(); }}>
          Clear
        </Button>
        <Button size="sm" onClick={() => onApply(localFrom || undefined, localTo || undefined)}>
          Apply
        </Button>
      </div>
    </div>
  );
}

function formatDateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  const f = (s?: string) => (s ? formatDate(parseISO(s), "MMM d, yyyy") : "…");
  return `${f(from)} – ${f(to)}`;
}

function FilterRow({
  filters,
  setFilters,
  platforms,
  symbols,
}: {
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  platforms: { id: string; name: string }[];
  symbols: { id: string; ticker: string }[];
}) {
  const platformLabel = filters.platformId
    ? platforms.find(p => p.id === filters.platformId)?.name ?? "—"
    : "All";
  const symbolLabel = filters.symbolId
    ? symbols.find(s => s.id === filters.symbolId)?.ticker ?? "—"
    : "All";
  const dateLabel = formatDateRange(filters.dateFrom, filters.dateTo) ?? "All";

  const anyActive =
    !!filters.platformId || !!filters.symbolId || !!filters.dateFrom || !!filters.dateTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterPill
        label="Platform"
        value={platformLabel}
        active={!!filters.platformId}
        onClear={() => setFilters(f => ({ ...f, platformId: undefined }))}
      >
        <ListPicker
          options={platforms.map(p => ({ id: p.id, label: p.name }))}
          selected={filters.platformId}
          onSelect={(id) => setFilters(f => ({ ...f, platformId: id }))}
          placeholder="Search platform..."
        />
      </FilterPill>
      <FilterPill
        label="Date Range"
        value={dateLabel}
        active={!!filters.dateFrom || !!filters.dateTo}
        onClear={() => setFilters(f => ({ ...f, dateFrom: undefined, dateTo: undefined }))}
      >
        <DateRangePicker
          from={filters.dateFrom}
          to={filters.dateTo}
          onApply={(from, to) => setFilters(f => ({ ...f, dateFrom: from, dateTo: to }))}
          onClear={() => setFilters(f => ({ ...f, dateFrom: undefined, dateTo: undefined }))}
        />
      </FilterPill>
      <FilterPill
        label="Symbol"
        value={symbolLabel}
        active={!!filters.symbolId}
        onClear={() => setFilters(f => ({ ...f, symbolId: undefined }))}
      >
        <ListPicker
          options={symbols.map(s => ({ id: s.id, label: s.ticker }))}
          selected={filters.symbolId}
          onSelect={(id) => setFilters(f => ({ ...f, symbolId: id }))}
          placeholder="Search symbol..."
        />
      </FilterPill>
      {anyActive && (
        <button
          type="button"
          onClick={() => setFilters({})}
          className="text-xs text-text-tertiary hover:text-text-primary transition-colors px-2"
        >
          Reset
        </button>
      )}
      <div className="ml-auto flex items-center gap-2">
        <AddTradeButton size="sm" />
      </div>
    </div>
  );
}

/* ---------------- KPI cards ---------------- */

function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
}: {
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
}) {
  const isPos = value >= 0;
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-5">
        <span className="text-xs uppercase tracking-[0.12em] text-text-tertiary">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "font-tabular text-[28px] font-semibold tracking-tight",
              isPos ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
            )}
          >
            {fmtMoney(value)}
          </span>
        </div>
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium font-tabular",
              delta >= 0
                ? "bg-[color:var(--positive-soft)] text-[color:var(--positive)]"
                : "bg-[color:var(--negative-soft)] text-[color:var(--negative)]",
            )}
          >
            {delta >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {fmtPct(delta)}
            {deltaLabel && (
              <span className="text-text-tertiary font-normal">{deltaLabel}</span>
            )}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function FreeCashCard({
  value,
  currencyCode,
}: {
  value: number;
  currencyCode: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-5">
        <span className="text-xs uppercase tracking-[0.12em] text-text-tertiary">
          Free Cash
        </span>
        <span className="font-tabular text-[28px] font-semibold tracking-tight text-text-primary">
          {formatAmount(value, currencyCode, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </span>
        <span className="text-[11px] text-text-tertiary">
          Unspent across active platforms
        </span>
      </CardContent>
    </Card>
  );
}

function CapitalGoalCard({
  current,
  target,
  currencyCode,
}: {
  current: number;
  target: number;
  currencyCode: string;
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-5">
        <span className="text-xs uppercase tracking-[0.12em] text-text-tertiary">
          Capital Goal
        </span>
        <div className="flex items-baseline gap-2">
          <span className="font-tabular text-[28px] font-semibold tracking-tight text-text-primary">
            {formatAmount(current, currencyCode, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
          <span className="text-xs text-text-tertiary font-tabular">
            / {formatAmount(target, currencyCode, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[color:var(--surface-2)] overflow-hidden">
          <div
            className="h-full rounded-full [background-image:linear-gradient(90deg,var(--brand-from),var(--positive))] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] text-text-tertiary font-tabular">
          {pct.toFixed(1)}% toward target
        </span>
      </CardContent>
    </Card>
  );
}

/* ---------------- weekly goal ---------------- */

function GoalRow({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = Math.max(target - current, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xs uppercase tracking-wide text-text-tertiary">
            {label}
          </span>
          <span className="text-xs text-text-tertiary font-tabular">
            ${target.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="text-base font-semibold tracking-tight font-tabular text-[color:var(--positive)]">
          {fmtMoney(current, false)}
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-[color:var(--surface-2)] overflow-hidden">
        <div
          className="h-full rounded-full [background-image:linear-gradient(90deg,var(--brand-from),var(--positive))] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <span>
          ${remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })} to go
        </span>
        <span className="font-tabular">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function GoalsCard({
  monthly,
  yearly,
}: {
  monthly: { current: number; target: number };
  yearly: { current: number; target: number };
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">
          Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <GoalRow label="Monthly" current={monthly.current} target={monthly.target} />
        <GoalRow label="Yearly" current={yearly.current} target={yearly.target} />
      </CardContent>
    </Card>
  );
}

/* ---------------- cumulative chart ---------------- */

function CumulativeChartCard({
  data,
}: {
  data: { period: string; cumulativePnl: number }[];
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-text-secondary">
          Cumulative P/L (All-time)
        </CardTitle>
        <div className="hidden sm:inline-flex rounded-full border border-border bg-[color:var(--surface-1)] p-0.5 text-[11px]">
          {["1M", "3M", "1Y", "All-time"].map((label, i) => (
            <button
              key={label}
              type="button"
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors",
                i === 3
                  ? "bg-[color:var(--surface-2)] text-text-primary"
                  : "text-text-tertiary hover:text-text-primary",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="h-[240px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-text-tertiary">
            No realized P/L history yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cumPnlFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={status.positive} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={status.positive} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chart.grid} vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                stroke={chart.axis}
                fontSize={11}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                stroke={chart.axis}
                fontSize={11}
                width={48}
                tickFormatter={(v) =>
                  Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
                }
              />
              <RechartsTooltip
                cursor={{ stroke: surface.s3, strokeWidth: 1 }}
                contentStyle={{
                  background: surface.s2,
                  border: `1px solid ${surface.border}`,
                  borderRadius: 10,
                  color: text.primary,
                  fontSize: 12,
                }}
                formatter={(val) => [fmtMoney(Number(val ?? 0)), "Cumulative P/L"]}
              />
              <Area
                type="monotone"
                dataKey="cumulativePnl"
                stroke={status.positive}
                strokeWidth={2}
                fill="url(#cumPnlFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- platforms summary ---------------- */

function PlatformsSummaryCard({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">
          Platforms Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-1">
        {data.length === 0 ? (
          <div className="text-sm text-text-tertiary">No platforms.</div>
        ) : (
          data.map((d) => {
            const pct = total > 0 ? (d.value / total) * 100 : 0;
            return (
              <div key={d.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{d.name}</span>
                  <span className="font-tabular text-text-primary">
                    ${d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="ml-2 text-[color:var(--positive)]">
                      {fmtPct(pct)}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[color:var(--surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full [background-image:linear-gradient(90deg,var(--brand-from),var(--brand-to))]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- recent trades ---------------- */

function RecentTradesCard() {
  const { data } = trpc.trades.list.useQuery({ page: 1, limit: 5 });
  const items = data?.items ?? [];

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-text-secondary">
          Recent Trades
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-tabular">
            <thead>
              <tr className="text-[11px] text-text-tertiary border-b border-border">
                <th className="text-left font-medium px-5 py-2">Date</th>
                <th className="text-left font-medium px-2 py-2">Symbol</th>
                <th className="text-left font-medium px-2 py-2">Side</th>
                <th className="text-right font-medium px-2 py-2">Qty</th>
                <th className="text-right font-medium px-2 py-2">Price</th>
                <th className="text-right font-medium px-2 py-2">Total</th>
                <th className="text-right font-medium px-5 py-2">P/L</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-text-tertiary">
                    No trades yet.
                  </td>
                </tr>
              ) : (
                items.map((t: any) => {
                  const total = Number(t.quantity) * Number(t.price);
                  const isBuy = t.tradeType === "buy";
                  const pnl = t.realizedPnl != null ? Number(t.realizedPnl) : null;
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-border/60 last:border-0 hover:bg-[color:var(--surface-2)]/40 transition-colors"
                    >
                      <td className="px-5 py-2 text-text-secondary">
                        {t.tradeDate}
                      </td>
                      <td className="px-2 py-2 font-medium text-text-primary">
                        {t.symbol?.ticker ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            isBuy
                              ? "bg-[color:var(--positive-soft)] text-[color:var(--positive)]"
                              : "bg-[color:var(--negative-soft)] text-[color:var(--negative)]",
                          )}
                        >
                          {t.tradeType}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">{Number(t.quantity)}</td>
                      <td className="px-2 py-2 text-right">
                        ${Number(t.price).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-right text-text-secondary">
                        ${total.toFixed(2)}
                      </td>
                      <td
                        className={cn(
                          "px-5 py-2 text-right font-medium",
                          isBuy
                            ? "text-text-tertiary"
                            : pnl == null
                              ? "text-text-tertiary"
                              : pnl >= 0
                                ? "text-[color:var(--positive)]"
                                : "text-[color:var(--negative)]",
                        )}
                      >
                        {isBuy
                          ? "—"
                          : pnl == null
                            ? "—"
                            : `${pnl >= 0 ? "+" : ""}${fmtMoney(pnl, false)}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border text-xs">
          <a
            href="/trades"
            className="text-[color:var(--info)] hover:underline"
          >
            View all trades →
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- gainers / losers ---------------- */

function MoversList({
  title,
  rows,
  positive,
}: {
  title: string;
  rows: { ticker: string; pnl: number; pct: number }[];
  positive: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border/60 px-0 pt-0">
        {rows.length === 0 ? (
          <div className="px-5 py-6 text-sm text-text-tertiary">No data.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.ticker}
              className="flex items-center justify-between gap-3 px-5 py-2.5"
            >
              <span
                className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary"
                title={r.ticker}
              >
                {r.ticker}
              </span>
              <span
                className={cn(
                  "shrink-0 whitespace-nowrap font-tabular text-sm tabular-nums",
                  positive
                    ? "text-[color:var(--positive)]"
                    : "text-[color:var(--negative)]",
                )}
              >
                {fmtMoney(r.pnl)}
                <span className="ml-2 text-xs text-text-tertiary">
                  {fmtPct(r.pct)}
                </span>
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- profit/loss by symbol ---------------- */

function ProfitLossBySymbolCard() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: string; ticker: string } | null>(null);
  const autoSelectedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: symbols = [] } = trpc.symbols.list.useQuery();
  const { data: pnlData, isLoading: pnlLoading } = trpc.trades.symbolPnl.useQuery(
    { symbolId: selected?.id ?? "" },
    { enabled: !!selected?.id },
  );

  // Auto-select first symbol once on load
  useEffect(() => {
    if (!autoSelectedRef.current && (symbols as any[]).length > 0) {
      autoSelectedRef.current = true;
      const first = (symbols as any[])[0];
      setSelected({ id: first.id, ticker: first.ticker });
      setQuery(first.ticker);
    }
  }, [symbols]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query || selected?.ticker === query) return symbols as any[];
    const q = query.toLowerCase();
    return (symbols as any[]).filter(
      (s) =>
        s.ticker.toLowerCase().includes(q) ||
        (s.displayName ?? "").toLowerCase().includes(q),
    );
  }, [symbols, query, selected]);

  function selectSymbol(sym: { id: string; ticker: string }) {
    setSelected(sym);
    setQuery(sym.ticker);
    setIsOpen(false);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    setIsOpen(false);
  }

  const totalPnl = pnlData?.totalPnl ?? 0;
  const chartData = pnlData?.chartData ?? [];

  return (
    // z-[60] + relative when dropdown open so this card's stacking context
    // sits above sibling grid cards (which have transition-based stacking contexts)
    <Card className={cn(isOpen && "relative z-[60]")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">
          P/L by Symbol
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Typeahead */}
        <div ref={containerRef} className="relative">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-[color:var(--surface-1)] px-3 py-2 focus-within:border-[color:var(--brand-ring)]">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search symbol…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
            />
            {query && (
              <button
                type="button"
                onClick={clear}
                className="text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isOpen && filtered.length > 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-[color:var(--surface-2)] shadow-xl overflow-hidden">
              {filtered.slice(0, 10).map((s: any) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSymbol({ id: s.id, ticker: s.ticker });
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-[color:var(--surface-3)] transition-colors text-left"
                >
                  <span className="font-medium text-text-primary">{s.ticker}</span>
                  {s.displayName && (
                    <span className="text-text-tertiary truncate">{s.displayName}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chart area */}
        {selected && (
          <>
            {pnlLoading ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-text-tertiary">
                Loading…
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-text-tertiary">
                No closed trades for {selected.ticker} yet.
              </div>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 6, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke={chart.grid} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      stroke={chart.axis}
                      fontSize={11}
                      minTickGap={40}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      stroke={chart.axis}
                      fontSize={11}
                      width={60}
                      tickFormatter={(v) => {
                        const abs = Math.abs(v);
                        const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}K` : `$${abs.toFixed(0)}`;
                        return v < 0 ? `-${s}` : s;
                      }}
                    />
                    <ReferenceLine y={0} stroke={surface.s3} strokeDasharray="4 3" />
                    <RechartsTooltip
                      cursor={{ fill: surface.s3, fillOpacity: 0.4 }}
                      contentStyle={{
                        background: surface.s2,
                        border: `1px solid ${surface.border}`,
                        borderRadius: 10,
                        color: text.primary,
                        fontSize: 12,
                      }}
                      formatter={(val: any, name: any) => {
                        if (val == null) return [null, null];
                        if (name === "pnl") return [fmtMoney(Number(val)), "Session P/L"];
                        if (name === "cumulative") return [fmtMoney(Number(val)), "Cumulative"];
                        return [val, name];
                      }}
                    />
                    <Bar dataKey="pnl" name="pnl" maxBarSize={40} radius={[3, 3, 0, 0]}>
                      {(chartData as any[]).map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.pnl >= 0 ? status.positive : status.negative}
                          fillOpacity={0.8}
                        />
                      ))}
                    </Bar>
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      name="cumulative"
                      stroke={brand.to}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: brand.to, strokeWidth: 0 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Total P/L */}
            {!pnlLoading && chartData.length > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-[color:var(--surface-1)] px-4 py-3">
                <span className="text-xs uppercase tracking-[0.1em] text-text-tertiary">
                  Total Realized P/L — {selected.ticker}
                </span>
                <span
                  className={cn(
                    "font-tabular text-lg font-semibold",
                    totalPnl > 0
                      ? "text-[color:var(--positive)]"
                      : totalPnl < 0
                        ? "text-[color:var(--negative)]"
                        : "text-text-secondary",
                  )}
                >
                  {fmtMoney(totalPnl)}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- page ---------------- */

export function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({});

  const { data: platformsList } = trpc.platforms.list.useQuery();
  const { data: symbolsList } = trpc.symbols.list.useQuery();

  const queryFilters = useMemo(() => ({ filters }), [filters]);
  const { data: perf, isLoading } = trpc.performance.stats.useQuery(queryFilters);
  const { data: positions } = trpc.positions.list.useQuery(queryFilters);

  const monthPnl = useMemo(() => {
    const arr = perf?.monthlyStats?.data;
    return arr && arr.length > 0 ? arr[arr.length - 1].pnl : 0;
  }, [perf]);

  const allTimePnl = perf?.totalRealizedPnl ?? 0;

  const monthlyGoal = perf?.goalProgress?.find(
    (g: any) => g.goalType === "monthly_profit",
  );
  const yearlyGoal = perf?.goalProgress?.find(
    (g: any) => g.goalType === "yearly_profit",
  );

  const portfolioStats = (perf as any)?.portfolioStats ?? [];

  const platforms = perf?.investedPerPlatform ?? [];

  const movers = useMemo(() => {
    const list = (positions ?? [])
      .filter((p: any) => Number(p.realizedPnl) !== 0)
      .map((p: any) => {
        const pnl = Number(p.realizedPnl);
        const cost = Number(p.totalCost) || 1;
        return {
          ticker: p.symbol?.ticker ?? "—",
          pnl,
          pct: (pnl / cost) * 100,
        };
      });
    const sortedDesc = [...list].sort((a, b) => b.pnl - a.pnl);
    return {
      gainers: sortedDesc.filter((r) => r.pnl > 0).slice(0, 5),
      losers: sortedDesc
        .filter((r) => r.pnl < 0)
        .sort((a, b) => a.pnl - b.pnl)
        .slice(0, 5),
    };
  }, [positions]);

  return (
    <div className="flex flex-col gap-6 animate-stagger-in">
      <FilterRow
        filters={filters}
        setFilters={setFilters}
        platforms={(platformsList as any[]) ?? []}
        symbols={(symbolsList as any[]) ?? []}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <FreeCashCard
          value={(perf as any)?.capitalProgress?.cashAmount ?? 0}
          currencyCode={(perf as any)?.capitalProgress?.currencyCode ?? "EUR"}
        />
        <CapitalGoalCard
          current={(perf as any)?.capitalProgress?.totalAmount ?? 0}
          target={(perf as any)?.capitalProgress?.targetAmount ?? 0}
          currencyCode={(perf as any)?.capitalProgress?.currencyCode ?? "EUR"}
        />
        <KpiCard label="Month P/L" value={monthPnl} delta={9.22} />
        <KpiCard label="All-time P/L" value={allTimePnl} delta={29.76} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GoalsCard
          monthly={{
            current: monthlyGoal?.current ?? monthPnl,
            target: monthlyGoal?.target ?? 2500,
          }}
          yearly={{
            current: yearlyGoal?.current ?? allTimePnl,
            target: yearlyGoal?.target ?? 30000,
          }}
        />
        <CumulativeChartCard data={portfolioStats} />
      </div>

      <PlatformsSummaryCard data={platforms} />

      <ProfitLossBySymbolCard />

      <RecentTradesCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MoversList title="Top Gainers" rows={movers.gainers} positive />
        <MoversList title="Top Losers" rows={movers.losers} positive={false} />
      </div>

      {isLoading && (
        <div className="text-xs text-text-tertiary">Loading…</div>
      )}
    </div>
  );
}
