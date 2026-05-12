"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Loader2, Plus, MoreHorizontal, RefreshCw, Search, BookOpen } from "lucide-react";
import { SymbolDialog } from "@/components/symbols/SymbolDialog";
import { CatalogBrowserDialog } from "@/components/symbols/CatalogBrowserDialog";
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

const PAGE_SIZE = 25;

export function SymbolsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [rsiFilter, setRsiFilter] = useState<RsiFilter>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<any>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => { setPage(1); }, [debouncedQ]);

  const { data, isLoading } = trpc.symbols.paged.useQuery({
    page,
    limit: PAGE_SIZE,
    q: debouncedQ || undefined,
  });

  const symbols = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  const tickerEntries = useMemo(
    () => symbols.map((s: any) => ({ ticker: s.ticker, rsiTicker: s.rsiTicker ?? null })),
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
      utils.symbols.paged.invalidate();
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

  const filtered = useMemo(() => {
    if (rsiFilter === "all") return symbols;
    return symbols.filter((s: any) => {
      const rsi = rsiMap[s.ticker]?.rsi;
      if (rsi == null) return false;
      const state = getRsiState(rsi);
      if (rsiFilter === "oversold") return state === "oversold" || state === "near-oversold";
      if (rsiFilter === "overbought") return state === "overbought" || state === "near-overbought";
      if (rsiFilter === "neutral") return state === "neutral";
      return true;
    });
  }, [symbols, rsiFilter, rsiMap]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Symbols</h1>
          <p className="text-muted-foreground mt-1">Manage the stocks and assets you trade.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsCatalogOpen(true)}>
            <BookOpen className="mr-2 h-4 w-4" /> Browse Catalog
          </Button>
          <Button variant="outline" onClick={() => enrichAll.mutate()} disabled={enrichAll.isPending || totalCount === 0}>
            {enrichAll.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh metadata
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Symbol
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-[320px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ticker or name..."
            className="pl-8"
          />
        </div>
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
      </div>

      <div className="rounded-md border bg-card overflow-x-auto [scrollbar-gutter:stable]">
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
                  {debouncedQ
                    ? "No symbols match your search."
                    : rsiFilter !== "all"
                    ? "No symbols match this RSI filter."
                    : "No symbols tracked yet. Add one or browse the catalog to start logging trades."}
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

      <div className="flex items-center justify-between py-1">
        <div className="text-sm text-text-tertiary">
          {totalCount > 0
            ? `Page ${page} of ${totalPages} (${totalCount.toLocaleString()} total)`
            : ""}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}>
            Next
          </Button>
        </div>
      </div>

      <SymbolDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        symbol={editingSymbol}
      />
      <CatalogBrowserDialog
        open={isCatalogOpen}
        onOpenChange={setIsCatalogOpen}
      />
    </div>
  );
}
