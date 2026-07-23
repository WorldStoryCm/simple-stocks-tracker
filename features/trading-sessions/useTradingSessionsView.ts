"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { replaySession } from "@/lib/trading-sessions/calculations";

export function useTradingSessionsView() {
  const [selectedId, setSelectedId] = useState("");
  const sessionsQuery = trpc.tradingSessions.list.useQuery();
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const defaultSession = sessions.find((session) => session.status === "active") ?? sessions[0];
  const resolvedSelectedId = sessions.some((session) => session.id === selectedId)
    ? selectedId
    : defaultSession?.id ?? "";

  const detailQuery = trpc.tradingSessions.get.useQuery(
    { id: resolvedSelectedId },
    { enabled: Boolean(resolvedSelectedId) },
  );
  const detail = detailQuery.data;
  const ticker = detail?.symbol.ticker;
  const quotesQuery = trpc.quotes.getMany.useQuery(
    { tickers: ticker ? [ticker] : [] },
    { enabled: Boolean(ticker), refetchInterval: 60_000 },
  );

  const currentPrice = useMemo(() => {
    const quotePrice = ticker ? quotesQuery.data?.[ticker]?.price : undefined;
    if (quotePrice && quotePrice > 0) return quotePrice;
    if (detail?.events.length) {
      const latest = [...detail.events].sort(
        (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime(),
      )[0];
      if (latest) return Number(latest.price);
    }
    return Number(detail?.openingMarketPrice ?? 0);
  }, [detail, quotesQuery.data, ticker]);

  const metrics = useMemo(() => {
    if (!detail) return null;
    return replaySession({
      quantity: detail.openingQuantity,
      totalCost: detail.openingTotalCost,
      marketPrice: detail.openingMarketPrice,
    }, detail.events, currentPrice);
  }, [currentPrice, detail]);

  return {
    selectedId: resolvedSelectedId,
    setSelectedId,
    sessions,
    sessionsQuery,
    detail,
    detailQuery,
    currentPrice,
    hasLiveQuote: Boolean(ticker && quotesQuery.data?.[ticker]?.price),
    metrics,
  };
}
