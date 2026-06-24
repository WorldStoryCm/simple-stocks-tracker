"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import {
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { cn } from "@/components/component.utils";
import { trpc } from "@/lib/trpc";
import { brand, chart, status, surface, text } from "@/lib/ui/tokens";
import type { DashboardFilters, DashboardSymbol } from "../types";
import { fmtMoney } from "../lib/format";

export function ProfitLossBySymbolCard({ filters }: { filters: DashboardFilters }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<DashboardSymbol | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: symbols = [], isLoading: symbolsLoading } = trpc.symbols.list.useQuery();
  const symbolOptions = symbols as DashboardSymbol[];
  const activeFilterSymbol = useMemo(() => {
    if (!filters.symbolId) return null;
    return symbolOptions.find((symbol) => symbol.id === filters.symbolId) ?? null;
  }, [filters.symbolId, symbolOptions]);
  const effectiveSelected = activeFilterSymbol ?? selected;

  const { data: pnlData, isLoading: pnlLoading } = trpc.trades.symbolPnl.useQuery(
    {
      symbolId: effectiveSelected?.id ?? "",
      platformId: filters.platformId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    },
    { enabled: !!effectiveSelected?.id },
  );

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const filtered = useMemo(() => {
    if (!query || selected?.ticker === query) return symbolOptions;
    const q = query.toLowerCase();
    return symbolOptions.filter(
      (symbol) =>
        symbol.ticker.toLowerCase().includes(q) ||
        (symbol.displayName ?? "").toLowerCase().includes(q),
    );
  }, [query, selected, symbolOptions]);

  function selectSymbol(symbol: DashboardSymbol) {
    setSelected(symbol);
    setQuery(symbol.ticker);
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
    <Card loading={symbolsLoading} className={cn("relative", isOpen && "z-[60]")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">P/L by Symbol</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div ref={containerRef} className="relative">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-[color:var(--surface-1)] px-3 py-2 focus-within:border-[color:var(--brand-ring)]">
            <input
              value={activeFilterSymbol?.ticker ?? query}
              onChange={(event) => {
                if (activeFilterSymbol) return;
                setQuery(event.target.value);
                setSelected(null);
                setIsOpen(true);
              }}
              onFocus={() => !activeFilterSymbol && setIsOpen(true)}
              placeholder="Search symbol..."
              disabled={!!activeFilterSymbol}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
            />
            {query && !activeFilterSymbol && (
              <button
                type="button"
                onClick={clear}
                className="text-text-tertiary transition-colors hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isOpen && !activeFilterSymbol && filtered.length > 0 && (
            <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-[color:var(--surface-2)] shadow-xl">
              {filtered.slice(0, 10).map((symbol) => (
                <button
                  key={symbol.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectSymbol(symbol);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-[color:var(--surface-3)]"
                >
                  <span className="font-medium text-text-primary">{symbol.ticker}</span>
                  {symbol.displayName && (
                    <span className="truncate text-text-tertiary">{symbol.displayName}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {effectiveSelected ? (
          <>
            {pnlLoading ? (
              <div className="h-[240px]" />
            ) : chartData.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-text-tertiary">
                No closed trades for {effectiveSelected.ticker} yet.
              </div>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={chart.grid} vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} stroke={chart.axis} fontSize={11} minTickGap={40} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      stroke={chart.axis}
                      fontSize={11}
                      width={60}
                      tickFormatter={(value) => {
                        const numeric = Number(value);
                        const abs = Math.abs(numeric);
                        const label = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}K` : `$${abs.toFixed(0)}`;
                        return numeric < 0 ? `-${label}` : label;
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
                      formatter={(value, name) => {
                        if (value == null) return ["", ""];
                        if (name === "pnl") return [fmtMoney(Number(value)), "Session P/L"];
                        if (name === "cumulative") return [fmtMoney(Number(value)), "Cumulative"];
                        return [String(value), String(name)];
                      }}
                    />
                    <Bar dataKey="pnl" name="pnl" maxBarSize={40} radius={[3, 3, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={index}
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

            {!pnlLoading && chartData.length > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-[color:var(--surface-1)] px-4 py-3">
                <span className="text-xs uppercase tracking-[0.1em] text-text-tertiary">
                  Total Realized P/L - {effectiveSelected.ticker}
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
        ) : (
          <div className="flex h-[240px] items-center justify-center text-sm text-text-tertiary">
            Select a symbol to view realized P/L.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
