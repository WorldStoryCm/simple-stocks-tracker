"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/button";
import { SegmentedControl } from "@/components/SegmentedControl";
import type { NewsFeedScope } from "@/app/server/services/news/types";
import { trpc } from "@/lib/trpc";
import { EventCalendar } from "./components/EventCalendar";
import { NewsFeedList } from "./components/NewsFeedList";

const NEWS_STALE_TIME_MS = 15 * 60 * 1000;
const NEWS_CACHE_TIME_MS = 60 * 60 * 1000;

const SCOPE_OPTIONS: { value: NewsFeedScope; label: string }[] = [
  { value: "active", label: "Active positions" },
  { value: "all", label: "All symbols" },
  { value: "owned_before", label: "Owned before" },
];

export function NewsPage() {
  const [scope, setScope] = useState<NewsFeedScope>("active");
  const queryInput = useMemo(() => ({ limitSymbols: 40, newsPerSymbol: 4, scope }), [scope]);
  const utils = trpc.useUtils();
  const { data, isLoading, isFetching, error } = trpc.news.feed.useQuery(queryInput, {
    gcTime: NEWS_CACHE_TIME_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: NEWS_STALE_TIME_MS,
  });
  const refreshMutation = trpc.news.refresh.useMutation({
    onSuccess: (freshData, variables) => {
      utils.news.feed.setData(variables ?? queryInput, freshData);
    },
  });

  const events = data?.events ?? [];
  const news = data?.news ?? [];
  const currentError = error ?? refreshMutation.error;
  const initialLoading = isLoading && !data;
  const refreshing = isFetching || refreshMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">News & Events</h1>
          <p className="mt-1 text-muted-foreground">
            Refresh-on-demand company headlines, earnings dates, and dividend events for your symbols.
          </p>
        </div>
        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          <div className="max-w-full overflow-x-auto pb-1">
            <SegmentedControl
              options={SCOPE_OPTIONS}
              value={scope}
              onChange={setScope}
              className="min-w-max"
            />
          </div>
          <Button variant="outline" onClick={() => refreshMutation.mutate(queryInput)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {currentError && (
        <div className="flex items-start gap-2 rounded-md border border-[color:var(--negative)]/25 bg-[color:var(--negative)]/10 px-4 py-3 text-sm text-[color:var(--negative)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{currentError.message}</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <NewsFeedList news={news} loading={initialLoading} />
        <EventCalendar events={events} loading={initialLoading} />
      </div>
    </div>
  );
}
