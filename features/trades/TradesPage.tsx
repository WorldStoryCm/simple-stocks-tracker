"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import { Loader2, Plus, MoreHorizontal, ArrowUpDown, ArrowDown, ArrowUp, Search } from "lucide-react";
import { TradeDialog } from "@/components/trades/TradeDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover";
import { formatAmount, formatPrice } from "@/lib/currency";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

type Trade = {
  id: string;
  tradeDate: string;
  tradeType: "buy" | "sell";
  symbol: { ticker: string };
  platform: { name: string };
  bucket?: { label: string } | null;
  price: string | number;
  quantity: string | number;
  currencyCode?: string;
  realizedPnl?: string | number | null;
};

type SortField = "tradeDate" | "symbolId" | "platformId" | "tradeType" | "price" | "quantity" | "total";

const COLUMN_SIZES = {
  date: 130,
  action: 90,
  symbol: 110,
  platform: 140,
  price: 120,
  quantity: 120,
  total: 140,
  pnl: 130,
  actions: 56,
};

export function TradesPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [bucketFilter, setBucketFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("tradeDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  const trades = (tradesData?.items ?? []) as Trade[];
  const totalPages = tradesData?.totalPages || 1;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1.5 inline h-3.5 w-3.5 opacity-30" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1.5 inline h-3.5 w-3.5" />
      : <ArrowDown className="ml-1.5 inline h-3.5 w-3.5" />;
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const utils = trpc.useUtils();
  const deleteMutation = trpc.trades.delete.useMutation({
    onSuccess: () => {
      utils.trades.list.invalidate();
      utils.positions.list.invalidate();
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this trade? It may corrupt FIFO matches if not careful.")) {
      deleteMutation.mutate({ id });
    }
  };

  const columns = useMemo<ColumnDef<Trade>[]>(
    () => [
      {
        id: "tradeDate",
        header: () => <span className="cursor-pointer" onClick={() => toggleSort("tradeDate")}>Date<SortIcon field="tradeDate" /></span>,
        size: COLUMN_SIZES.date,
        cell: ({ row }) => format(new Date(row.original.tradeDate), "MMM d, yyyy"),
      },
      {
        id: "tradeType",
        header: () => <span className="cursor-pointer" onClick={() => toggleSort("tradeType")}>Action<SortIcon field="tradeType" /></span>,
        size: COLUMN_SIZES.action,
        cell: ({ row }) => {
          const isBuy = row.original.tradeType === "buy";
          return (
            <span
              className={
                "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
                (isBuy
                  ? "bg-[color:var(--positive-soft)] text-[color:var(--positive)]"
                  : "bg-[color:var(--negative-soft)] text-[color:var(--negative)]")
              }
            >
              {row.original.tradeType}
            </span>
          );
        },
      },
      {
        id: "symbol",
        header: () => <span className="cursor-pointer" onClick={() => toggleSort("symbolId")}>Symbol<SortIcon field="symbolId" /></span>,
        size: COLUMN_SIZES.symbol,
        cell: ({ row }) => <span className="font-semibold">{row.original.symbol.ticker}</span>,
      },
      {
        id: "platform",
        header: () => <span className="cursor-pointer" onClick={() => toggleSort("platformId")}>Platform<SortIcon field="platformId" /></span>,
        size: COLUMN_SIZES.platform,
        cell: ({ row }) => <span className="text-text-secondary">{row.original.platform.name}</span>,
      },
      {
        id: "price",
        header: () => <span className="cursor-pointer" onClick={() => toggleSort("price")}>Price<SortIcon field="price" /></span>,
        size: COLUMN_SIZES.price,
        meta: { align: "right" } as const,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatPrice(Number(row.original.price), row.original.currencyCode || "USD")}
          </span>
        ),
      },
      {
        id: "quantity",
        header: () => <span className="cursor-pointer" onClick={() => toggleSort("quantity")}>Qty<SortIcon field="quantity" /></span>,
        size: COLUMN_SIZES.quantity,
        meta: { align: "right" } as const,
        cell: ({ row }) => <span className="tabular-nums">{Number(row.original.quantity).toFixed(4)}</span>,
      },
      {
        id: "total",
        header: () => <span className="cursor-pointer" onClick={() => toggleSort("total")}>Total<SortIcon field="total" /></span>,
        size: COLUMN_SIZES.total,
        meta: { align: "right" } as const,
        cell: ({ row }) => (
          <span className="tabular-nums font-semibold">
            {formatAmount(Number(row.original.quantity) * Number(row.original.price), row.original.currencyCode || "USD")}
          </span>
        ),
      },
      {
        id: "pnl",
        header: () => <span>P/L</span>,
        size: COLUMN_SIZES.pnl,
        meta: { align: "right" } as const,
        cell: ({ row }) => {
          const t = row.original;
          if (t.tradeType === "buy") return <span className="text-text-tertiary">—</span>;
          const pnl = t.realizedPnl != null ? Number(t.realizedPnl) : null;
          if (pnl == null) return <span className="text-text-tertiary">—</span>;
          const cls = pnl >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]";
          const sign = pnl >= 0 ? "+" : "";
          return (
            <span className={`tabular-nums font-semibold ${cls}`}>
              {sign}{formatAmount(pnl, t.currencyCode || "USD")}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        size: COLUMN_SIZES.actions,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingTrade(row.original);
                  setIsDialogOpen(true);
                }}
              >
                Edit Trade
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(row.original.id)}
                className="text-destructive"
              >
                Delete Trade
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortField, sortDir]
  );

  const table = useReactTable({
    data: trades,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const colTotal = Object.values(COLUMN_SIZES).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trading Ledger</h1>
        </div>
        <Button onClick={() => { setEditingTrade(null); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Trade
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Tabs
          defaultValue="all"
          value={actionFilter}
          onValueChange={(v) => { setActionFilter(v); setPage(1); }}
          className="w-full sm:w-auto rounded-lg"
        >
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
                {symbols
                  ?.filter((s: any) => s.ticker.toLowerCase().includes(symbolSearch.toLowerCase()))
                  .sort((a: any, b: any) => a.ticker.localeCompare(b.ticker))
                  .map((s: any) => (
                    <Button
                      key={s.id}
                      variant="ghost"
                      className="w-full justify-start font-normal"
                      onClick={() => { setSymbolFilter(s.id); setSymbolOpen(false); setPage(1); }}
                    >
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

      <div className="rounded-[var(--radius-lg)] border border-border bg-card overflow-x-auto [scrollbar-gutter:stable]">
        <table
          className="w-full text-sm"
          style={{ tableLayout: "fixed", minWidth: colTotal }}
        >
          <colgroup>
            {table.getVisibleLeafColumns().map((col) => (
              <col key={col.id} style={{ width: col.getSize() }} />
            ))}
          </colgroup>
          <thead className="bg-[color:var(--surface-2)]/40">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => {
                  const align = (header.column.columnDef.meta as any)?.align ?? "left";
                  return (
                    <th
                      key={header.id}
                      className={
                        "h-10 px-3 align-middle text-xs font-medium uppercase tracking-wide text-text-tertiary whitespace-nowrap " +
                        (align === "right" ? "text-right" : "text-left")
                      }
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-border">
                  {table.getVisibleLeafColumns().map((col) => (
                    <td key={col.id} className="h-11 px-3 align-middle">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-[color:var(--surface-2)]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : trades.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center text-text-tertiary">
                  No trades recorded yet.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-[color:var(--surface-2)]/40"
                >
                  {row.getVisibleCells().map((cell) => {
                    const align = (cell.column.columnDef.meta as any)?.align ?? "left";
                    return (
                      <td
                        key={cell.id}
                        className={
                          "h-11 px-3 align-middle whitespace-nowrap overflow-hidden text-ellipsis " +
                          (align === "right" ? "text-right" : "text-left")
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="text-sm text-text-tertiary">
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
