"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/dialog";
import { Loader2, Search, RefreshCw, Plus, Check } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CatalogBrowserDialog({ open, onOpenChange }: Props) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const utils = trpc.useUtils();
  const { data: status, refetch: refetchStatus } = trpc.tickerCatalog.status.useQuery(
    undefined,
    { enabled: open },
  );
  const { data, isLoading } = trpc.tickerCatalog.list.useQuery(
    { page, limit: 25, q: debouncedQ || undefined },
    { enabled: open },
  );
  const { data: ownedSymbols } = trpc.symbols.list.useQuery(undefined, { enabled: open });

  const ownedSet = useMemo(
    () => new Set((ownedSymbols ?? []).map((s: any) => (s.ticker || "").toUpperCase())),
    [ownedSymbols],
  );

  const sync = trpc.tickerCatalog.sync.useMutation({
    onSuccess: (res) => {
      toast.success(`Catalog synced: ${res.upserted} tickers`);
      utils.tickerCatalog.list.invalidate();
      refetchStatus();
    },
    onError: (err) => toast.error(`Sync failed: ${err.message}`),
  });

  const create = trpc.symbols.create.useMutation({
    onSuccess: () => {
      utils.symbols.list.invalidate();
      utils.symbols.paged.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to add"),
  });

  const handleAdd = (row: any) => {
    create.mutate(
      {
        ticker: row.symbol,
        displayName: row.name ?? undefined,
        exchange: row.exchange ?? undefined,
      },
      { onSuccess: () => toast.success(`Added ${row.symbol}`) },
    );
  };

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;
  const isCatalogEmpty = (status?.total ?? 0) === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[680px] max-h-[calc(100dvh-1rem)] sm:max-h-[85vh] overflow-hidden flex flex-col p-0">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6">
          <DialogHeader title="Browse Ticker Catalog" />
          <p className="text-xs text-text-tertiary mt-1">
            {status?.total ? (
              <>
                {status.total.toLocaleString()} tickers
                {status.lastSyncedAt && ` · Synced ${format(new Date(status.lastSyncedAt), "MMM d, yyyy")}`}
              </>
            ) : (
              <>Catalog is empty. Click Sync to download from NASDAQ Trader.</>
            )}
          </p>
        </div>

        <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by ticker or name..."
              className="pl-8 h-9"
              disabled={isCatalogEmpty}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
          >
            {sync.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isCatalogEmpty ? "Download" : "Sync"}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-2 min-h-[200px]">
          {isCatalogEmpty ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-text-tertiary">
              {sync.isPending
                ? "Downloading catalog from NASDAQ Trader..."
                : "Click Download to fetch ~10k tickers from NASDAQ Trader."}
            </div>
          ) : isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-text-tertiary">
              No matches.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-tertiary">
                  <th className="py-2 pr-2 font-medium">Symbol</th>
                  <th className="py-2 pr-2 font-medium">Name</th>
                  <th className="py-2 pr-2 font-medium">Exchange</th>
                  <th className="py-2 pl-2 font-medium text-right w-[80px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row: any) => {
                  const owned = ownedSet.has(row.symbol);
                  return (
                    <tr key={row.symbol} className="border-b border-border last:border-0">
                      <td className="py-2 pr-2 font-semibold tabular-nums">
                        {row.symbol}
                        {row.isEtf && (
                          <span className="ml-1.5 inline-block rounded bg-[color:var(--surface-2)] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-tertiary">
                            ETF
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-text-secondary truncate max-w-[280px]" title={row.name ?? undefined}>
                        {row.name || "—"}
                      </td>
                      <td className="py-2 pr-2 text-text-tertiary">{row.exchange || "—"}</td>
                      <td className="py-2 pl-2 text-right">
                        {owned ? (
                          <span className="inline-flex items-center text-xs text-text-tertiary">
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Added
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => handleAdd(row)}
                            disabled={create.isPending}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="px-4 sm:px-6 py-3 border-t border-border flex-row items-center justify-between gap-3">
          <div className="text-xs text-text-tertiary">
            {!isCatalogEmpty && totalCount > 0 && (
              <>Page {data?.page ?? page} of {totalPages} · {totalCount.toLocaleString()} results</>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading || isCatalogEmpty}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading || isCatalogEmpty}
            >
              Next
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
