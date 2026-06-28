"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { TradeDialog } from "@/components/trades/TradeDialog";
import { ViewPositionDialog } from "@/components/positions/ViewPositionDialog";
import { RsiBacktestDialog } from "@/components/rsi/RsiBacktestDialog";
import { HeatmapView } from "./components/HeatmapView";
import { PositionsExportMenu } from "./components/PositionsExportMenu";
import { PositionsFilterBar } from "./components/PositionsFilterBar";
import { PositionsTable, type RsiMapEntry } from "./components/PositionsTable";
import { PositionsPagination } from "./components/PositionsPagination";
import { usePositionsView } from "./usePositionsView";

export function PositionsPage() {
  const { data: positions, isLoading } = trpc.positions.list.useQuery();
  const openPositions = useMemo(
    () => (positions ?? []).filter((p: any) => p.openQty > 0),
    [positions],
  );

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
    const map: Record<string, RsiMapEntry> = {};
    if (rsiData) {
      for (const [ticker, r] of Object.entries(rsiData)) {
        if (r) map[ticker] = { rsi: r.rsi, error: r.error, via: (r as any).via, history: (r as any).history ?? [] };
      }
    }
    return map;
  }, [rsiData]);

  const { data: symbols } = trpc.symbols.list.useQuery();
  const { data: platforms } = trpc.platforms.list.useQuery();

  const view = usePositionsView({ openPositions, quotes });

  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [prefilledTrade, setPrefilledTrade] = useState<any>(null);
  const [viewPosition, setViewPosition] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [backtestTicker, setBacktestTicker] = useState<{ ticker: string; rsiTicker: string | null } | null>(null);

  const handleQuickAction = (pos: any, type: "buy" | "sell") => {
    setPrefilledTrade({
      platformId: pos.platform?.id,
      symbolId: pos.symbol?.id,
      tradeType: type,
    });
    setIsTradeDialogOpen(true);
  };

  const handleViewPosition = (pos: any) => {
    setViewPosition(pos);
    setIsViewDialogOpen(true);
  };

  const handleAggregateDrill = (pos: any) => {
    view.setSymbolFilter(pos.symbol.id);
    view.setGroupBy("lot");
    view.setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PositionsFilterBar
        symbols={symbols as any[] | undefined}
        platforms={platforms as any[] | undefined}
        symbolFilter={view.filters.symbolFilter}
        setSymbolFilter={view.setSymbolFilter}
        platformFilter={view.filters.platformFilter}
        setPlatformFilter={view.setPlatformFilter}
        groupBy={view.filters.groupBy}
        setGroupBy={view.setGroupBy}
        actions={<PositionsExportMenu positions={view.filtered} isLoading={isLoading} />}
        onChange={() => view.setPage(1)}
      />

      <Tabs defaultValue="table" className="w-full">
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <PositionsTable
            positions={view.paginated}
            isLoading={isLoading}
            quotes={quotes}
            rsiMap={rsiMap}
            sortField={view.sort.sortField}
            sortDir={view.sort.sortDir}
            onToggleSort={view.toggleSort}
            onViewPosition={handleViewPosition}
            onQuickAction={handleQuickAction}
            onAggregateDrill={handleAggregateDrill}
            onBacktest={setBacktestTicker}
          />

          <PositionsPagination
            page={view.page}
            totalPages={view.totalPages}
            total={view.display.length}
            unitLabel={view.filters.groupBy === "ticker" ? "tickers" : "lots"}
            isLoading={isLoading}
            onPage={view.setPage}
          />
        </TabsContent>

        <TabsContent value="heatmap">
          <HeatmapView
            positions={view.display}
            quotes={quotes}
            isLoading={isLoading}
            onSelect={(p) => p._isAggregate ? handleAggregateDrill(p) : handleViewPosition(p)}
          />
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
