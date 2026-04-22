"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Loader2, Plus, MoreHorizontal, RefreshCw } from "lucide-react";
import { SymbolDialog } from "@/components/symbols/SymbolDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/dropdown-menu";
import { RsiBadge, getRsiState } from "@/components/rsi/RsiBadge";
import toast from "react-hot-toast";
import { cn } from "@/components/component.utils";

type RsiFilter = "all" | "oversold" | "neutral" | "overbought";

const FILTER_CHIPS: { label: string; value: RsiFilter }[] = [
  { label: "All", value: "all" },
  { label: "RSI < 30  Oversold", value: "oversold" },
  { label: "Neutral RSI", value: "neutral" },
  { label: "RSI > 70  Overbought", value: "overbought" },
];

export function SymbolsPage() {
  const { data: symbols, isLoading } = trpc.symbols.list.useQuery();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<any>(null);
  const [rsiFilter, setRsiFilter] = useState<RsiFilter>("all");

  const tickerEntries = useMemo(
    () => symbols?.map((s: any) => ({ ticker: s.ticker, rsiTicker: s.rsiTicker ?? null })) ?? [],
    [symbols],
  );

  const { data: rsiData } = trpc.rsi.getMany.useQuery(
    { tickers: tickerEntries },
    { enabled: tickerEntries.length > 0 },
  );

  const rsiMap = useMemo(() => {
    const map: Record<string, { rsi: number | null; error?: "not_found" | "fetch_failed" | "insufficient_data"; via?: string }> = {};
    if (rsiData) {
      for (const [ticker, r] of Object.entries(rsiData)) {
        if (r) map[ticker] = { rsi: r.rsi, error: r.error, via: (r as any).via };
      }
    }
    return map;
  }, [rsiData]);

  const utils = trpc.useUtils();
  const enrichAll = trpc.symbols.enrichAll.useMutation({
    onSuccess: (result) => {
      toast.success(`Refreshed ${result.updated}/${result.total} symbols${result.failed ? ` (${result.failed} failed)` : ""}`);
      utils.symbols.list.invalidate();
      utils.performance.stats.invalidate();
    },
    onError: (err) => toast.error(`Refresh failed: ${err.message}`),
  });

  const handleEdit = (symbol: any) => {
    setEditingSymbol(symbol);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingSymbol(null);
    setIsDialogOpen(true);
  };

  const tickers = useMemo(() => tickerEntries.map((e) => e.ticker), [tickerEntries]);

  const sorted = useMemo(
    () => symbols?.slice().sort((a: any, b: any) => a.ticker.localeCompare(b.ticker)) ?? [],
    [symbols],
  );

  const filtered = useMemo(() => {
    if (rsiFilter === "all") return sorted;
    return sorted.filter((s: any) => {
      const rsi = rsiMap[s.ticker]?.rsi;
      if (rsi == null) return false;
      const state = getRsiState(rsi);
      if (rsiFilter === "oversold") return state === "oversold" || state === "near-oversold";
      if (rsiFilter === "overbought") return state === "overbought" || state === "near-overbought";
      if (rsiFilter === "neutral") return state === "neutral";
      return true;
    });
  }, [sorted, rsiFilter, rsiMap]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Symbols</h1>
          <p className="text-muted-foreground mt-1">Manage the stocks and assets you trade.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => enrichAll.mutate()} disabled={enrichAll.isPending || !symbols?.length}>
            {enrichAll.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh metadata
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Symbol
          </Button>
        </div>
      </div>

      {/* RSI filter chips */}
      {tickers.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setRsiFilter(chip.value)}
              className={cn(
                "rounded border px-3 py-1 text-xs font-medium transition-colors",
                rsiFilter === chip.value
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Exchange</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>RSI-14</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {rsiFilter !== "all"
                    ? "No symbols match this RSI filter."
                    : "No symbols tracked yet. Add one to start logging trades."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((sym: any) => (
                <TableRow key={sym.id}>
                  <TableCell className="font-bold">{sym.ticker}</TableCell>
                  <TableCell>{sym.displayName || "-"}</TableCell>
                  <TableCell>{sym.exchange || "-"}</TableCell>
                  <TableCell>{sym.sector || <span className="text-muted-foreground italic">Unclassified</span>}</TableCell>
                  <TableCell>
                    <RsiBadge rsi={rsiMap[sym.ticker]?.rsi ?? null} error={rsiMap[sym.ticker]?.error ?? null} via={rsiMap[sym.ticker]?.via} inline />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(sym)}>
                          Edit Symbol
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SymbolDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        symbol={editingSymbol}
      />
    </div>
  );
}
