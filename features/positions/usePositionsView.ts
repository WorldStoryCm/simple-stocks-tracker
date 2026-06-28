"use client";

import { useMemo, useState } from "react";
import type { PositionsGroupBy } from "./components/PositionsFilterBar";
import type { PositionsSortDir, PositionsSortField } from "./components/PositionsTable";

const PAGE_SIZE = 40;

function compareBy(
  a: any,
  b: any,
  field: PositionsSortField,
  quotes: any,
): [any, any] {
  const quoteA = quotes?.[a.symbol.ticker];
  const quoteB = quotes?.[b.symbol.ticker];
  const marketPriceA = quoteA?.price || Number(a.avgCost);
  const marketPriceB = quoteB?.price || Number(b.avgCost);
  switch (field) {
    case "symbol": return [a.symbol.ticker, b.symbol.ticker];
    case "platform": return [a.platform.name, b.platform.name];
    case "qty": return [Number(a.openQty), Number(b.openQty)];
    case "cost": return [Number(a.avgCost), Number(b.avgCost)];
    case "invested": return [Number(a.investedAmount), Number(b.investedAmount)];
    case "price": return [marketPriceA, marketPriceB];
    case "value": return [Number(a.openQty) * marketPriceA, Number(b.openQty) * marketPriceB];
  }
}

function sortRows<T>(rows: T[], field: PositionsSortField, dir: PositionsSortDir, quotes: any): T[] {
  return [...rows].sort((a, b) => {
    const [valA, valB] = compareBy(a, b, field, quotes);
    if (valA < valB) return dir === "asc" ? -1 : 1;
    if (valA > valB) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

function aggregateByTicker(rows: any[]): any[] {
  const groups = new Map<string, any[]>();
  for (const p of rows) {
    const key = p.symbol.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return Array.from(groups.values()).map((lots) => {
    const totalQty = lots.reduce((s, l) => s + Number(l.openQty), 0);
    const totalInvested = lots.reduce((s, l) => s + Number(l.investedAmount), 0);
    const platformNames = Array.from(new Set(lots.map((l) => l.platform.name)));
    return {
      symbol: lots[0].symbol,
      platform: {
        id: null,
        name: platformNames.length === 1 ? platformNames[0] : `${platformNames.length} platforms`,
      },
      openQty: totalQty,
      avgCost: totalQty > 0 ? totalInvested / totalQty : 0,
      investedAmount: totalInvested,
      currencyCode: lots[0].currencyCode,
      _isAggregate: true,
      _lotCount: lots.length,
    };
  });
}

export function usePositionsView({
  openPositions,
  quotes,
}: {
  openPositions: any[];
  quotes: any;
}) {
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<PositionsGroupBy>("lot");
  const [sortField, setSortField] = useState<PositionsSortField>("symbol");
  const [sortDir, setSortDir] = useState<PositionsSortDir>("asc");
  const [page, setPage] = useState(1);

  const toggleSort = (field: PositionsSortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let arr = [...openPositions];
    if (symbolFilter !== "all") arr = arr.filter((p) => p.symbol.id === symbolFilter);
    if (platformFilter !== "all") arr = arr.filter((p) => p.platform.id === platformFilter);
    return sortRows(arr, sortField, sortDir, quotes);
  }, [openPositions, symbolFilter, platformFilter, sortField, sortDir, quotes]);

  const display = useMemo(() => {
    if (groupBy === "lot") return filtered;
    return sortRows(aggregateByTicker(filtered), sortField, sortDir, quotes);
  }, [filtered, groupBy, sortField, sortDir, quotes]);

  const totalPages = Math.ceil(display.length / PAGE_SIZE) || 1;
  const paginated = display.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    filters: { symbolFilter, platformFilter, groupBy },
    setSymbolFilter,
    setPlatformFilter,
    setGroupBy,
    sort: { sortField, sortDir },
    toggleSort,
    page,
    setPage,
    totalPages,
    filtered,
    display,
    paginated,
  };
}
