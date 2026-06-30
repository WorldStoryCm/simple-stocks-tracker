"use client";

import { useCallback, useState } from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Download, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/button";
import { AddTradeButton } from "@/components/trades/AddTradeButton";
import { TradeDialog } from "@/components/trades/TradeDialog";
import { trpc } from "@/lib/trpc";
import { ImportTransactionsDialog } from "@/features/imports/ImportTransactionsDialog";
import { downloadCsv } from "@/features/imports/downloadCsv";
import { TradesTable } from "./components/TradesTable";
import { TradesToolbar } from "./components/TradesToolbar";
import type { SortDir, SortField, Trade, TradePlatformOption, TradeSymbolOption } from "./types";
import { useTradesColumns } from "./useTradesColumns";

export function TradesPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("tradeDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const resetPage = useCallback(() => setPage(1), []);
  const { data: symbols } = trpc.symbols.list.useQuery();
  const { data: platforms } = trpc.platforms.list.useQuery();
  const { data: tradesData, isLoading } = trpc.trades.list.useQuery({
    page,
    limit: 40,
    action: actionFilter,
    symbolId: symbolFilter !== "all" ? symbolFilter : undefined,
    platformId: platformFilter !== "all" ? platformFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortField,
    sortDir,
  });

  const utils = trpc.useUtils();
  const exportMutation = trpc.imports.exportLedger.useMutation({
    onSuccess: (result) => {
      downloadCsv(result.fileName, result.fileContent);
      toast.success(`Exported ${result.rowCount} rows`);
    },
    onError: (error) => toast.error(error.message || "Export failed"),
  });
  const deleteMutation = trpc.trades.delete.useMutation({
    onSuccess: () => {
      utils.trades.list.invalidate();
      utils.positions.list.invalidate();
    },
  });

  const trades = (tradesData?.items ?? []) as Trade[];
  const totalPages = tradesData?.totalPages || 1;

  const toggleSort = useCallback((field: SortField) => {
    setSortField((currentField) => {
      if (currentField === field) {
        setSortDir((currentDir) => (currentDir === "asc" ? "desc" : "asc"));
        return currentField;
      }
      setSortDir("desc");
      return field;
    });
    setPage(1);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm("Are you sure you want to delete this trade? It will recalculate average-cost matches for this symbol.")) {
      deleteMutation.mutate({ id });
    }
  }, [deleteMutation]);

  const columns = useTradesColumns({
    sortField,
    sortDir,
    onSort: toggleSort,
    onEdit: (trade) => {
      setEditingTrade(trade);
      setIsDialogOpen(true);
    },
    onDelete: handleDelete,
  });

  const table = useReactTable({
    data: trades,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Trading Ledger</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate({})}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {exportMutation.isPending ? "Exporting..." : "Export Trades"}
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            Import
          </Button>
          <AddTradeButton />
        </div>
      </div>

      <TradesToolbar
        symbols={(symbols ?? []) as TradeSymbolOption[]}
        platforms={(platforms ?? []) as TradePlatformOption[]}
        actionFilter={actionFilter}
        symbolFilter={symbolFilter}
        platformFilter={platformFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        setActionFilter={setActionFilter}
        setSymbolFilter={setSymbolFilter}
        setPlatformFilter={setPlatformFilter}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        resetPage={resetPage}
      />

      <TradesTable table={table} columns={columns} isLoading={isLoading} tradesCount={trades.length} />

      <div className="flex items-center justify-between py-2">
        <div className="text-sm text-text-tertiary">
          Showing page {page} of {totalPages} ({tradesData?.totalCount || 0} total)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page >= totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      </div>

      <TradeDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingTrade(null);
        }}
        trade={editingTrade}
      />
      <ImportTransactionsDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
