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
  const fxQuery = trpc.tradingSessions.fxRate.useQuery();
  const currentPrice = Number(
    detail?.manualMarkPrice
    ?? detail?.openingMarketPrice
    ?? 0,
  );
  const usdPerEur = Number(detail?.usdPerEur ?? fxQuery.data?.usdPerEur ?? 1);

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
    usdPerEur,
    metrics,
  };
}
