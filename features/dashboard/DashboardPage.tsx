"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Button } from "@/components/button";
import {
  ChevronDown,
  Plus,
  Settings2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/components/component.utils";
import { chart, status, surface, text } from "@/lib/ui/tokens";

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

function FilterPill({
  label,
  value = "All",
}: {
  label: string;
  value?: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-[color:var(--surface-1)] px-3 py-1.5 text-xs text-text-secondary hover:bg-[color:var(--surface-2)] hover:text-text-primary transition-colors"
    >
      <span className="text-text-tertiary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
      <ChevronDown className="h-3 w-3 text-text-tertiary" />
    </button>
  );
}

function FilterRow() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterPill label="Platform" />
      <FilterPill label="Bucket" />
      <FilterPill label="Date Range" value="Apr 15 – Apr 21, 2026" />
      <FilterPill label="Symbol" />
      <button
        type="button"
        className="text-xs text-text-tertiary hover:text-text-primary transition-colors px-2"
      >
        Reset
      </button>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Settings2 className="h-3.5 w-3.5" />
          Customize
        </Button>
        <Button variant="default" size="sm">
          <Plus className="h-3.5 w-3.5" />
          Add Trade
        </Button>
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

/* ---------------- bucket budget ---------------- */

const BUCKET_COLORS = [
  "var(--brand-to)",
  "var(--positive)",
  "var(--warning)",
  "var(--negative)",
];

function BucketBudgetCard({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-text-secondary">
          Bucket Budget Usage
        </CardTitle>
        <button
          type="button"
          className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
        >
          Manage
        </button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-1">
        {data.length === 0 ? (
          <div className="text-sm text-text-tertiary">No buckets.</div>
        ) : (
          data.map((d, i) => {
            const target = d.value * 1.4 || 1;
            const pct = Math.min((d.value / target) * 100, 100);
            const color = BUCKET_COLORS[i % BUCKET_COLORS.length];
            return (
              <div key={d.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{d.name}</span>
                  <span className="font-tabular text-text-primary">
                    ${d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="ml-1 text-text-tertiary">
                      / ${target.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="ml-2 text-text-secondary">{pct.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[color:var(--surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: color }}
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
              className="flex items-center justify-between px-5 py-2.5"
            >
              <span className="text-sm font-medium text-text-primary">
                {r.ticker}
              </span>
              <span
                className={cn(
                  "font-tabular text-sm",
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

  // Y-axis domain: snug around actual price range with 4% padding
  const allPrices = chartData.flatMap((d: any) =>
    [d.buyPrice, d.sellPrice].filter((v) => v != null) as number[],
  );
  const yMin = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const yMax = allPrices.length > 0 ? Math.max(...allPrices) : 1;
  const yPad = (yMax - yMin) * 0.15 || yMax * 0.05;
  const yDomain: [number, number] = [
    Math.max(0, yMin - yPad),
    yMax + yPad,
  ];

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
                No trades for {selected.ticker}.
              </div>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
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
                      domain={yDomain}
                      tickFormatter={(v) =>
                        Math.abs(v) >= 1000
                          ? `$${(v / 1000).toFixed(1)}K`
                          : `$${Number(v).toFixed(2)}`
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
                      formatter={(val: any, name: any, props: any) => {
                        if (val == null) return [null, null];
                        const label = name === "buyPrice" ? "Buy Price" : "Sell Price";
                        const pnl = props.payload?.pnl;
                        const extra =
                          name === "sellPrice" && pnl != null
                            ? `   P/L: ${fmtMoney(pnl)}`
                            : "";
                        return [`${fmtMoney(Number(val), false)}${extra}`, label];
                      }}
                    />
                    <Legend
                      formatter={(val) => (val === "buyPrice" ? "Buy" : "Sell")}
                      wrapperStyle={{ fontSize: 11, color: text.secondary }}
                    />
                    <Line
                      type="linear"
                      dataKey="buyPrice"
                      name="buyPrice"
                      stroke={status.positive}
                      strokeWidth={2}
                      dot={{ r: 4, fill: status.positive, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                    <Line
                      type="linear"
                      dataKey="sellPrice"
                      name="sellPrice"
                      stroke={status.negative}
                      strokeWidth={2}
                      dot={{ r: 4, fill: status.negative, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                  </LineChart>
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
  const { data: perf, isLoading } = trpc.performance.stats.useQuery();
  const { data: positions } = trpc.positions.list.useQuery();

  const todayPnl = useMemo(() => {
    const arr = perf?.dailyStats?.data;
    return arr && arr.length > 0 ? arr[arr.length - 1].pnl : 0;
  }, [perf]);

  const weekPnl = useMemo(() => {
    const arr = perf?.weeklyStats?.data;
    return arr && arr.length > 0 ? arr[arr.length - 1].pnl : 0;
  }, [perf]);

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
  const buckets = perf?.investedPerBucket ?? [];

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <FilterRow />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KpiCard label="Today P/L" value={todayPnl} delta={0.62} />
        <KpiCard label="Week P/L" value={weekPnl} delta={3.41} />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlatformsSummaryCard data={platforms} />
        <BucketBudgetCard data={buckets} />
      </div>

      <ProfitLossBySymbolCard />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <RecentTradesCard />
        <MoversList title="Top Gainers" rows={movers.gainers} positive />
        <MoversList title="Top Losers" rows={movers.losers} positive={false} />
      </div>

      {isLoading && (
        <div className="text-xs text-text-tertiary">Loading…</div>
      )}
    </div>
  );
}
