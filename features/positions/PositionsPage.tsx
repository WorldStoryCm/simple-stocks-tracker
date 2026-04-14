"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Loader2, MoreHorizontal, ArrowUpDown, ArrowDown, ArrowUp, Search } from "lucide-react";
import { Button } from "@/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/dropdown-menu";
import { TradeDialog } from "@/components/trades/TradeDialog";
import { ViewPositionDialog } from "@/components/positions/ViewPositionDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { formatAmount, formatPrice, currencySymbol } from "@/lib/currency";

export function PositionsPage() {
  const { data: positions, isLoading } = trpc.positions.list.useQuery();

  const openPositions = positions?.filter((p: any) => p.openQty > 0) || [];

  const tickers = useMemo(() => {
    return Array.from(new Set(openPositions.map((p: any) => p.symbol.ticker)));
  }, [openPositions]);

  const { data: quotes } = trpc.quotes.getMany.useQuery({ tickers }, {
    enabled: tickers.length > 0,
    refetchInterval: 60000 // Refetch every 1 minute
  });

  const [symbolFilter, setSymbolFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [bucketFilter, setBucketFilter] = useState("all");
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

  const limit = 40;
  const totalPages = Math.ceil(filteredPositions.length / limit) || 1;
  const paginatedPositions = filteredPositions.slice((page - 1) * limit, page * limit);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Unrealized Positions</h1>
          <p className="text-muted-foreground mt-1">Manage all your open trading lots natively.</p>
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
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("symbol")}>Symbol <SortIcon field="symbol" /></TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("platform")}>Platform <SortIcon field="platform" /></TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("bucket")}>Bucket <SortIcon field="bucket" /></TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("qty")}>Open Qty <SortIcon field="qty" /></TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("cost")}>Avg Cost <SortIcon field="cost" /></TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("invested")}>Invested <SortIcon field="invested" /></TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("price")}>Live Price <SortIcon field="price" /></TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("value")}>Total Value <SortIcon field="value" /></TableHead>
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
            ) : filteredPositions.length === 0 ? (
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
                const pnl = currentVal - investedAmount;
                const pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

                return (
                  <TableRow key={idx}>
                    <TableCell className="font-bold">{pos.symbol.ticker}</TableCell>
                    <TableCell>{pos.platform.name}</TableCell>
                    <TableCell>{pos.bucket?.label || <span className="text-muted-foreground italic">None</span>}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{Number(pos.openQty).toFixed(4)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(Number(pos.avgCost), pos.currencyCode || 'USD')}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(investedAmount, pos.currencyCode || 'USD')}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(marketPrice, quote?.currency || pos.currencyCode || 'USD')}
                      {quote && <span className={`ml-1 text-xs ${quote.changePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                        ({quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                      </span>}
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
                          <DropdownMenuItem onClick={() => handleViewPosition(pos)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickAction(pos, 'buy')}>
                            Buy More
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickAction(pos, 'sell')}>
                            Sell Position
                          </DropdownMenuItem>
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
          Showing page {page} of {totalPages} ({filteredPositions.length} total)
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}>Next</Button>
        </div>
      </div>

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
    </div>
  );
}
