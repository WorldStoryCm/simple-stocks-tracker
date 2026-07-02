"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CalendarDays, Loader2, Newspaper, RefreshCw, Tags } from "lucide-react";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { SegmentedControl } from "@/components/SegmentedControl";
import type { NewsFeedScope } from "@/app/server/services/news/types";
import { trpc } from "@/lib/trpc";
import { EventCalendar } from "./components/EventCalendar";
import { NewsFeedList } from "./components/NewsFeedList";
import { SourceResearch } from "./components/SourceResearch";
import { formatDateTime } from "./format";

const SCOPE_OPTIONS: { value: NewsFeedScope; label: string }[] = [
  { value: "all", label: "All symbols" },
  { value: "active", label: "Active positions" },
  { value: "owned_before", label: "Owned before" },
];

const SCOPE_LABELS: Record<NewsFeedScope, string> = {
  all: "all tracked symbols",
  active: "active positions",
  owned_before: "closed past holdings",
};

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-md p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-text-tertiary">{label}</div>
          <div className="mt-2 text-2xl font-semibold">{value}</div>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[color:var(--surface-2)] text-text-tertiary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

export function NewsPage() {
  const [scope, setScope] = useState<NewsFeedScope>("all");
  const queryInput = useMemo(() => ({ limitSymbols: 40, newsPerSymbol: 4, scope }), [scope]);
  const { data, isLoading, isFetching, error, refetch } = trpc.news.feed.useQuery(queryInput, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const events = data?.events ?? [];
  const news = data?.news ?? [];
  const updatedLabel = data?.refreshedAt ? formatDateTime(data.refreshedAt) : "Not refreshed";

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
              disabled={isFetching}
              className="min-w-max"
            />
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Symbols covered" value={(data?.symbolCount ?? 0).toLocaleString()} icon={Tags} />
        <MetricCard label="Headlines" value={news.length.toLocaleString()} icon={Newspaper} />
        <MetricCard label="Upcoming events" value={events.length.toLocaleString()} icon={CalendarDays} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-[color:var(--surface-2)] px-4 py-3 text-sm text-text-secondary">
        <span>Current provider: Yahoo Finance via server-side yahoo-finance2 calls.</span>
        <span className="text-text-tertiary">Viewing {SCOPE_LABELS[scope]}</span>
        <span className="text-text-tertiary">Last refresh: {updatedLabel}</span>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-[color:var(--negative)]/25 bg-[color:var(--negative)]/10 px-4 py-3 text-sm text-[color:var(--negative)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error.message}</span>
        </div>
      )}

      {!!data?.warnings.length && (
        <div className="rounded-md border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 px-4 py-3 text-sm text-text-secondary">
          <span className="font-medium text-text-primary">Partial refresh:</span>{" "}
          {data.warnings.join(", ")}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <NewsFeedList news={news} loading={isLoading} />
        <EventCalendar events={events} loading={isLoading} />
      </div>

      <SourceResearch />
    </div>
  );
}
