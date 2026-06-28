"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/button";
import { trpc } from "@/lib/trpc";
import { DividendFilters } from "./components/DividendFilters";
import { DividendSummaryCards } from "./components/DividendSummaryCards";
import { DividendsTable } from "./components/DividendsTable";
import type { DividendEvent, DividendPlatformOption, DividendSymbolOption } from "./types";

export function DividendsPage() {
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState("all");
  const [platformId, setPlatformId] = useState("all");
  const [symbolId, setSymbolId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const resetPage = useCallback(() => setPage(1), []);
  const queryFilters = useMemo(() => ({
    eventType: eventType as "all" | "dividend" | "dividend_tax",
    platformId: platformId !== "all" ? platformId : undefined,
    symbolId: symbolId !== "all" ? symbolId : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [dateFrom, dateTo, eventType, platformId, symbolId]);

  const { data: platforms } = trpc.platforms.list.useQuery();
  const { data: symbols } = trpc.symbols.list.useQuery();
  const { data: summary, isLoading: summaryLoading } = trpc.dividends.summary.useQuery(queryFilters);
  const { data, isLoading } = trpc.dividends.list.useQuery({ ...queryFilters, page, limit: 40 });

  const totalPages = data?.totalPages || 1;
  const items = (data?.items ?? []) as DividendEvent[];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dividends</h1>
      </div>

      <DividendSummaryCards summary={summary} loading={summaryLoading} />

      <DividendFilters
        platforms={(platforms ?? []) as DividendPlatformOption[]}
        symbols={(symbols ?? []) as DividendSymbolOption[]}
        eventType={eventType}
        platformId={platformId}
        symbolId={symbolId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        setEventType={setEventType}
        setPlatformId={setPlatformId}
        setSymbolId={setSymbolId}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        resetPage={resetPage}
      />

      <DividendsTable items={items} isLoading={isLoading} />

      <div className="flex items-center justify-between py-2">
        <div className="text-sm text-text-tertiary">
          Showing page {page} of {totalPages} ({data?.totalCount || 0} total)
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
    </div>
  );
}
