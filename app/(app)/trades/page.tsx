"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Loader2, Plus, MoreHorizontal } from "lucide-react";
import { TradeDialog } from "@/components/trades/TradeDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/dropdown-menu";
import { format } from "date-fns";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover";
import { ArrowUpDown, ArrowDown, ArrowUp, Search } from "lucide-react";

export default function TradesPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [bucketFilter, setBucketFilter] = useState("all");
  const [sortField, setSortField] = useState<"tradeDate"|"symbolId"|"platformId"|"tradeType"|"price"|"quantity"|"total">("tradeDate");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");

  const [symbolOpen, setSymbolOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");

  const { data: symbols } = trpc.symbols.list.useQuery();
  const { data: platforms } = trpc.platforms.list.useQuery();
  const { data: buckets } = trpc.buckets.list.useQuery();

  const { data: tradesData, isLoading } = trpc.trades.list.useQuery({
    page,
    limit: 40,
    action: actionFilter,
    symbolId: symbolFilter !== "all" ? symbolFilter : undefined,
    platformId: platformFilter !== "all" ? platformFilter : undefined,
    bucketId: bucketFilter !== "all" ? bucketFilter : undefined,
    sortField,
    sortDir,
  });

  const trades = tradesData?.items || [];
  const totalPages = tradesData?.totalPages || 1;

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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<any>(null);

  const utils = trpc.useUtils();
  const deleteMutation = trpc.trades.delete.useMutation({
    onSuccess: () => {
      utils.trades.list.invalidate();
      utils.positions.list.invalidate();
    }
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this trade? It may corrupt FIFO matches if not careful.")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Ledger</h1>
        </div>
        <Button onClick={() => { setEditingTrade(null); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Trade
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Tabs defaultValue="all" value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }} className="w-full sm:w-auto overflow-x-auto rounded-lg">
          <TabsList className="grid w-full grid-cols-3 min-w-[200px]">
            <TabsTrigger value="all">All Actions</TabsTrigger>
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
        </Tabs>

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
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("tradeDate")}>Date <SortIcon field="tradeDate" /></TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("tradeType")}>Action <SortIcon field="tradeType" /></TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("symbolId")}>Symbol <SortIcon field="symbolId" /></TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("platformId")}>Platform <SortIcon field="platformId" /></TableHead>
              <TableHead>Bucket</TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("price")}>Price <SortIcon field="price" /></TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("quantity")}>Quantity <SortIcon field="quantity" /></TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("total")}>Total Volume <SortIcon field="total" /></TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : trades?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No trades recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              trades?.map((trade: any) => (
                <TableRow key={trade.id}>
                  <TableCell>{format(new Date(trade.tradeDate), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase ${
                        trade.tradeType === 'buy'
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}
                    >
                      {trade.tradeType}
                    </span>
                  </TableCell>
                  <TableCell className="font-bold">{trade.symbol.ticker}</TableCell>
                  <TableCell>{trade.platform.name}</TableCell>
                  <TableCell>{trade.bucket.label}</TableCell>
                  <TableCell className="text-right">${Number(trade.price).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(trade.quantity).toFixed(4)}</TableCell>
                  <TableCell className="text-right">${(Number(trade.quantity) * Number(trade.price)).toFixed(2)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingTrade(trade); setIsDialogOpen(true); }}>
                          Edit Trade
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(trade.id)} className="text-destructive">
                          Delete Trade
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

      <div className="flex items-center justify-between py-2">
        <div className="text-sm text-muted-foreground">
          Showing page {page} of {totalPages} ({tradesData?.totalCount || 0} total)
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}>Next</Button>
        </div>
      </div>

      <TradeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        trade={editingTrade}
      />
    </div>
  );
}
