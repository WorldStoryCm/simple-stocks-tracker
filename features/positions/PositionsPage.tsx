"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Loader2, MoreHorizontal, ArrowUpDown, ArrowDown, ArrowUp, Search } from "lucide-react";
import { Button } from "@/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/dropdown-menu";
import { RsiBadge, getRsiState } from "@/components/rsi/RsiBadge";
import { RsiBacktestDialog } from "@/components/rsi/RsiBacktestDialog";
import { TradeDialog } from "@/components/trades/TradeDialog";
import { ViewPositionDialog } from "@/components/positions/ViewPositionDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { Treemap, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { formatAmount, formatPrice, currencySymbol } from "@/lib/currency";

// Map PnL% to a color along a red→neutral→green gradient.
// Intensity saturates at ±20% so extreme values don't dominate.
function pnlColor(pnlPct: number): string {
  const clamped = Math.max(-20, Math.min(20, pnlPct));
  const t = Math.abs(clamped) / 20; // 0..1 intensity
  if (clamped >= 0) {
    // green: hsl(142, 70%, L) — L goes 40→22 as intensity grows
    const l = 40 - t * 18;
    return `hsl(142 70% ${l}%)`;
  }
  // red: hsl(0, 72%, L)
  const l = 45 - t * 20;
  return `hsl(0 72% ${l}%)`;
}

function HeatmapContent(props: any) {
  const { x, y, width, height, name, pnlPct, depth } = props;
  if (width <= 0 || height <= 0) return null;
  // Recharts renders the root container (depth 0) through this same component.
  // The root has no custom data fields — skip its rect so only the leaf tiles paint.
  if (depth === 0) return null;
  const hasPct = typeof pnlPct === "number" && Number.isFinite(pnlPct);
  const fill = pnlColor(hasPct ? pnlPct : 0);
  const showLabel = width > 50 && height > 30;
  const showPct = hasPct && width > 70 && height > 45;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="hsl(var(--background))" strokeWidth={2} style={{ cursor: "pointer" }} />
      {showLabel && (
        <text x={x + width / 2} y={y + height / 2 - (showPct ? 8 : 0)} textAnchor="middle" fill="#fff" fontSize={Math.min(16, Math.max(11, width / 8))} fontWeight={700}>
          {name}
        </text>
      )}
      {showPct && (
        <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={11} opacity={0.9}>
          {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%
        </text>
      )}
    </g>
  );
}

function HeatmapView({ positions, quotes, isLoading, onSelect }: { positions: any[]; quotes: any; isLoading: boolean; onSelect: (p: any) => void }) {
  const data = useMemo(() => {
    return positions
      .map((pos) => {
        const quote = quotes?.[pos.symbol.ticker];
        const marketPrice = quote?.price || Number(pos.avgCost);
        const currentVal = Number(pos.openQty) * marketPrice;
        const invested = Number(pos.investedAmount);
        const pnl = currentVal - invested;
        const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
        return { name: pos.symbol.ticker, size: currentVal, pnl, pnlPct, invested, pos };
      })
      .filter((d) => d.size > 0);
  }, [positions, quotes]);

  if (isLoading) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-md border bg-card">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-md border bg-card text-muted-foreground text-sm">
        No open positions to visualize.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card p-2">
      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            nameKey="name"
            stroke="hsl(var(--background))"
            content={<HeatmapContent />}
            onClick={(node: any) => node?.pos && onSelect(node.pos)}
            isAnimationActive={false}
          >
            <RechartsTooltip
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                    <div className="font-bold">{d.name}</div>
                    <div className="text-muted-foreground">Value: ${d.size.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-muted-foreground">Invested: ${d.invested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className={d.pnl >= 0 ? "text-green-500 font-semibold" : "text-red-500 font-semibold"}>
                      P/L: {d.pnl >= 0 ? "+" : ""}${d.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({d.pnlPct >= 0 ? "+" : ""}{d.pnlPct.toFixed(2)}%)
                    </div>
                  </div>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted-foreground px-2">
        Tile size = current market value. Color = unrealized P/L % (saturates at ±20%). Click a tile to view details.
      </p>
    </div>
  );
}

export function PositionsPage() {
  const { data: positions, isLoading } = trpc.positions.list.useQuery();

  const openPositions = positions?.filter((p: any) => p.openQty > 0) || [];

  const tickerEntries = useMemo(() => {
    const seen = new Set<string>();
    const entries: { ticker: string; rsiTicker: string | null }[] = [];
    for (const p of openPositions) {
      if (!seen.has(p.symbol.ticker)) {
        seen.add(p.symbol.ticker);
        entries.push({ ticker: p.symbol.ticker, rsiTicker: p.symbol.rsiTicker ?? null });
      }
    }
    return entries;
  }, [openPositions]);

  const tickers = useMemo(() => tickerEntries.map((e) => e.ticker), [tickerEntries]);

  const { data: quotes } = trpc.quotes.getMany.useQuery({ tickers }, {
    enabled: tickers.length > 0,
    refetchInterval: 60000,
  });

  const { data: rsiData } = trpc.rsi.getMany.useQuery(
    { tickers: tickerEntries },
    { enabled: tickerEntries.length > 0 },
  );

  const rsiMap = useMemo(() => {
    const map: Record<string, { rsi: number | null; error?: "not_found" | "fetch_failed" | "insufficient_data"; via?: string; history?: number[] }> = {};
    if (rsiData) {
      for (const [ticker, r] of Object.entries(rsiData)) {
        if (r) map[ticker] = { rsi: r.rsi, error: r.error, via: (r as any).via, history: (r as any).history ?? [] };
      }
    }
    return map;
  }, [rsiData]);

  // Contextual label: how RSI interprets an *open* position.
  // Up + high RSI = stretched, down + low RSI = oversold risk, etc.
  const positionRsiLabel = (rsi: number, pnlPct: number): string => {
    const state = getRsiState(rsi);
    if (state === "overbought") return pnlPct >= 0 ? "Stretched" : "Momentum Fading";
    if (state === "near-overbought") return pnlPct >= 0 ? "Momentum Strong" : "Fading";
    if (state === "oversold") return pnlPct < 0 ? "Oversold Risk" : "Reversal?";
    if (state === "near-oversold") return pnlPct < 0 ? "Near Oversold" : "Cooling";
    return "Neutral";
  };

  const [symbolFilter, setSymbolFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [bucketFilter, setBucketFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<"lot"|"ticker">("lot");
  const [sortField, setSortField] = useState<"symbol"|"platform"|"bucket"|"qty"|"cost"|"invested"|"price"|"value">("symbol");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [page, setPage] = useState(1);

  const [symbolOpen, setSymbolOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");

  const { data: symbols } = trpc.symbols.list.useQuery();
  const { data: platforms } = trpc.platforms.list.useQuery();
  const { data: buckets } = trpc.buckets.list.useQuery();

  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [prefilledTrade, setPrefilledTrade] = useState<any>(null);

  const [viewPosition, setViewPosition] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [backtestTicker, setBacktestTicker] = useState<{ ticker: string; rsiTicker: string | null } | null>(null);

  const handleQuickAction = (pos: any, type: "buy" | "sell") => {
    setPrefilledTrade({
      platformId: pos.platform?.id,
      symbolId: pos.symbol?.id,
      bucketId: pos.bucket?.id,
      tradeType: type,
    });
    setIsTradeDialogOpen(true);
  };

  const handleViewPosition = (pos: any) => {
    setViewPosition(pos);
    setIsViewDialogOpen(true);
  };

  const toggleSort = (field: any) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-20" />;
    return sortDir === "asc" ? <ArrowUp className="ml-2 h-4 w-4 inline" /> : <ArrowDown className="ml-2 h-4 w-4 inline" />;
  };

  // Perform filtering & sorting locally because live market attributes are dynamically retrieved
  const filteredPositions = useMemo(() => {
    let arr = [...openPositions];
    
    if (symbolFilter !== "all") arr = arr.filter(p => p.symbol.id === symbolFilter);
    if (platformFilter !== "all") arr = arr.filter(p => p.platform.id === platformFilter);
    if (bucketFilter !== "all") {
      if (bucketFilter === "none") arr = arr.filter(p => !p.bucket);
      else arr = arr.filter(p => p.bucket?.id === bucketFilter);
    }

    arr.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      const quoteA = quotes?.[a.symbol.ticker];
      const quoteB = quotes?.[b.symbol.ticker];
      const marketPriceA = quoteA?.price || Number(a.avgCost);
      const marketPriceB = quoteB?.price || Number(b.avgCost);

      switch (sortField) {
        case "symbol": valA = a.symbol.ticker; valB = b.symbol.ticker; break;
        case "platform": valA = a.platform.name; valB = b.platform.name; break;
        case "bucket": valA = a.bucket?.label || ""; valB = b.bucket?.label || ""; break;
        case "qty": valA = Number(a.openQty); valB = Number(b.openQty); break;
        case "cost": valA = Number(a.avgCost); valB = Number(b.avgCost); break;
        case "invested": valA = Number(a.investedAmount); valB = Number(b.investedAmount); break;
        case "price": valA = marketPriceA; valB = marketPriceB; break;
        case "value": valA = Number(a.openQty) * marketPriceA; valB = Number(b.openQty) * marketPriceB; break;
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [openPositions, symbolFilter, platformFilter, bucketFilter, sortField, sortDir, quotes]);

  // When grouping by ticker, collapse lots across platforms/buckets into one aggregated row.
  const displayPositions = useMemo(() => {
    if (groupBy === "lot") return filteredPositions;

    const groups = new Map<string, any[]>();
    for (const p of filteredPositions) {
      const key = p.symbol.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }

    const aggregated = Array.from(groups.values()).map((lots) => {
      const totalQty = lots.reduce((s, l) => s + Number(l.openQty), 0);
      const totalInvested = lots.reduce((s, l) => s + Number(l.investedAmount), 0);
      const platformNames = Array.from(new Set(lots.map((l) => l.platform.name)));
      const bucketLabels = Array.from(new Set(lots.map((l) => l.bucket?.label).filter(Boolean)));
      return {
        symbol: lots[0].symbol,
        platform: {
          id: null,
          name: platformNames.length === 1 ? platformNames[0] : `${platformNames.length} platforms`,
        },
        bucket: bucketLabels.length === 0
          ? null
          : { id: null, label: bucketLabels.length === 1 ? bucketLabels[0] : `${bucketLabels.length} buckets` },
        openQty: totalQty,
        avgCost: totalQty > 0 ? totalInvested / totalQty : 0,
        investedAmount: totalInvested,
        currencyCode: lots[0].currencyCode,
        _isAggregate: true,
        _lotCount: lots.length,
      };
    });

    // Re-sort the aggregated rows using the current sort field.
    aggregated.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      const quoteA = quotes?.[a.symbol.ticker];
      const quoteB = quotes?.[b.symbol.ticker];
      const marketPriceA = quoteA?.price || Number(a.avgCost);
      const marketPriceB = quoteB?.price || Number(b.avgCost);

      switch (sortField) {
        case "symbol": valA = a.symbol.ticker; valB = b.symbol.ticker; break;
        case "platform": valA = a.platform.name; valB = b.platform.name; break;
        case "bucket": valA = a.bucket?.label || ""; valB = b.bucket?.label || ""; break;
        case "qty": valA = Number(a.openQty); valB = Number(b.openQty); break;
        case "cost": valA = Number(a.avgCost); valB = Number(b.avgCost); break;
        case "invested": valA = Number(a.investedAmount); valB = Number(b.investedAmount); break;
        case "price": valA = marketPriceA; valB = marketPriceB; break;
        case "value": valA = Number(a.openQty) * marketPriceA; valB = Number(b.openQty) * marketPriceB; break;
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return aggregated;
  }, [filteredPositions, groupBy, sortField, sortDir, quotes]);

  const limit = 40;
  const totalPages = Math.ceil(displayPositions.length / limit) || 1;
  const paginatedPositions = displayPositions.slice((page - 1) * limit, page * limit);

  // Drill into the underlying lots of an aggregated ticker row.
  const handleAggregateDrill = (pos: any) => {
    setSymbolFilter(pos.symbol.id);
    setGroupBy("lot");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Positions</h1>
          <p className="text-text-tertiary text-sm mt-1">Manage all open trading lots across platforms.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap flex-1">
          <Popover open={symbolOpen} onOpenChange={setSymbolOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[150px] justify-between font-normal">
                {symbolFilter === "all" ? "All Symbols" : symbols?.find((s: any) => s.id === symbolFilter)?.ticker || "All Symbols"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 shadow-lg border">
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  placeholder="Search symbol..."
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0"
                  value={symbolSearch}
                  onChange={(e) => setSymbolSearch(e.target.value)}
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto p-1">
                <Button variant="ghost" className="w-full justify-start font-normal" onClick={() => { setSymbolFilter("all"); setSymbolOpen(false); }}>
                  All Symbols
                </Button>
                {symbols?.filter((s: any) => s.ticker.toLowerCase().includes(symbolSearch.toLowerCase())).sort((a: any, b: any) => a.ticker.localeCompare(b.ticker)).map((s: any) => (
                  <Button key={s.id} variant="ghost" className="w-full justify-start font-normal" onClick={() => { setSymbolFilter(s.id); setSymbolOpen(false); setPage(1); }}>
                    {s.ticker}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {platforms?.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={bucketFilter} onValueChange={(v) => { setBucketFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Buckets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buckets</SelectItem>
              <SelectItem value="none">Uncategorized</SelectItem>
              {buckets?.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={groupBy} onValueChange={(v: "lot"|"ticker") => { setGroupBy(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lot">Group: Lot</SelectItem>
              <SelectItem value="ticker">Group: Ticker</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="table" className="w-full">
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
      <div className="rounded-[var(--radius-lg)] border border-border bg-card overflow-x-auto [scrollbar-gutter:stable]">
        <Table>
          <TableHeader className="bg-[color:var(--surface-2)]/40">
            <TableRow className="border-border">
              <TableHead className="cursor-pointer hover:bg-[color:var(--surface-2)] text-text-tertiary text-[11px] uppercase tracking-[0.1em]" onClick={() => toggleSort("symbol")}>Symbol <SortIcon field="symbol" /></TableHead>
              <TableHead className="cursor-pointer hover:bg-[color:var(--surface-2)] text-text-tertiary text-[11px] uppercase tracking-[0.1em]" onClick={() => toggleSort("platform")}>Platform <SortIcon field="platform" /></TableHead>
              <TableHead className="cursor-pointer hover:bg-[color:var(--surface-2)] text-text-tertiary text-[11px] uppercase tracking-[0.1em]" onClick={() => toggleSort("bucket")}>Bucket <SortIcon field="bucket" /></TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-[color:var(--surface-2)] text-text-tertiary text-[11px] uppercase tracking-[0.1em]" onClick={() => toggleSort("qty")}>Open Qty <SortIcon field="qty" /></TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-[color:var(--surface-2)] text-text-tertiary text-[11px] uppercase tracking-[0.1em]" onClick={() => toggleSort("cost")}>Avg Cost <SortIcon field="cost" /></TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-[color:var(--surface-2)] text-text-tertiary text-[11px] uppercase tracking-[0.1em]" onClick={() => toggleSort("invested")}>Invested <SortIcon field="invested" /></TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-[color:var(--surface-2)] text-text-tertiary text-[11px] uppercase tracking-[0.1em]" onClick={() => toggleSort("price")}>Live Price <SortIcon field="price" /></TableHead>
              <TableHead className="text-text-tertiary text-[11px] uppercase tracking-[0.1em]">RSI-14</TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-[color:var(--surface-2)] text-text-tertiary text-[11px] uppercase tracking-[0.1em]" onClick={() => toggleSort("value")}>Total Value <SortIcon field="value" /></TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="animate-stagger-in">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : displayPositions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No open positions found. Buy some stocks to see them here.
                </TableCell>
              </TableRow>
            ) : (
              paginatedPositions.map((pos: any, idx) => {
                const quote = quotes?.[pos.symbol.ticker];
                const marketPrice = quote?.price || Number(pos.avgCost);
                const currentVal = Number(pos.openQty) * marketPrice;
                const investedAmount = Number(pos.investedAmount);
                const isAgg = pos._isAggregate;

                return (
                  <TableRow key={idx}>
                    <TableCell className="font-bold">
                      {pos.symbol.ticker}
                      {isAgg && <span className="ml-2 text-xs font-normal text-muted-foreground">({pos._lotCount} lots)</span>}
                    </TableCell>
                    <TableCell className={isAgg && pos.platform.name.includes("platforms") ? "text-muted-foreground italic" : ""}>{pos.platform.name}</TableCell>
                    <TableCell>{pos.bucket?.label ? (
                      <span className={isAgg && pos.bucket.label.includes("buckets") ? "text-muted-foreground italic" : ""}>{pos.bucket.label}</span>
                    ) : <span className="text-muted-foreground italic">None</span>}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{Number(pos.openQty).toFixed(4)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(Number(pos.avgCost), pos.currencyCode || 'USD')}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(investedAmount, pos.currencyCode || 'USD')}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(marketPrice, quote?.currency || pos.currencyCode || 'USD')}
                      {quote && <span className={`ml-1 text-xs ${quote.changePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                        ({quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                      </span>}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const entry = rsiMap[pos.symbol.ticker];
                        if (!entry) return <span className="text-xs text-muted-foreground">—</span>;
                        if (entry.rsi == null) {
                          return <RsiBadge rsi={null} error={entry.error ?? null} inline />;
                        }
                        const pnlPct = investedAmount > 0
                          ? ((currentVal - investedAmount) / investedAmount) * 100
                          : 0;
                        return (
                          <div className="flex items-center gap-1.5">
                            <RsiBadge rsi={entry.rsi} via={entry.via} history={entry.history} inline />
                            <span className="text-[10px] text-muted-foreground">
                              {positionRsiLabel(entry.rsi, pnlPct)}
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${currentVal < investedAmount ? "text-red-500 dark:text-red-400" : ""}`}>{formatAmount(currentVal, quote?.currency || pos.currencyCode || 'USD')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isAgg ? (
                            <DropdownMenuItem onClick={() => handleAggregateDrill(pos)}>
                              View Lots
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => handleViewPosition(pos)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQuickAction(pos, 'buy')}>
                                Buy More
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQuickAction(pos, 'sell')}>
                                Sell Position
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setBacktestTicker({ ticker: pos.symbol.ticker, rsiTicker: pos.symbol.rsiTicker ?? null })}>
                                Backtest RSI &lt; 35
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="text-sm text-muted-foreground">
          Showing page {page} of {totalPages} ({displayPositions.length} {groupBy === "ticker" ? "tickers" : "lots"})
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}>Next</Button>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="heatmap">
          <HeatmapView positions={displayPositions} quotes={quotes} isLoading={isLoading} onSelect={(p) => p._isAggregate ? handleAggregateDrill(p) : handleViewPosition(p)} />
        </TabsContent>
      </Tabs>

      <TradeDialog
        open={isTradeDialogOpen}
        onOpenChange={setIsTradeDialogOpen}
        trade={prefilledTrade}
      />

      <ViewPositionDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        pos={viewPosition}
        quote={viewPosition ? quotes?.[viewPosition.symbol?.ticker] : undefined}
      />

      <RsiBacktestDialog
        open={backtestTicker !== null}
        onOpenChange={(o) => { if (!o) setBacktestTicker(null); }}
        ticker={backtestTicker?.ticker ?? null}
        rsiTicker={backtestTicker?.rsiTicker ?? null}
      />
    </div>
  );
}
