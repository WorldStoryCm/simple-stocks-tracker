"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/skeleton";
import { trpc } from "@/lib/trpc";
import {
  currencyFactor,
  sessionCurrency,
  type SessionCurrency,
} from "@/lib/trading-sessions/currency";
import { AcquisitionLots } from "./components/AcquisitionLots";
import { CreateSessionDialog } from "./components/CreateSessionDialog";
import { PriceLadder } from "./components/PriceLadder";
import { SessionActivity } from "./components/SessionActivity";
import { SessionEmptyState } from "./components/SessionEmptyState";
import { SessionEventForm } from "./components/SessionEventForm";
import { SessionHeader } from "./components/SessionHeader";
import { SessionInputs } from "./components/SessionInputs";
import { SessionSummary } from "./components/SessionSummary";
import { TargetPriceCard } from "./components/TargetPriceCard";
import { useTradingSessionsView } from "./useTradingSessionsView";

export function TradingSessionsPage() {
  const view = useTradingSessionsView();
  const [createOpen, setCreateOpen] = useState(false);
  const [plan, setPlan] = useState<{ sessionId: string; quantity: number } | null>(null);
  const [display, setDisplay] = useState<{
    sessionId: string;
    currency: SessionCurrency;
  } | null>(null);
  const { data: positions = [] } = trpc.positions.list.useQuery();
  const { data: platforms = [] } = trpc.platforms.list.useQuery();
  const { data: symbols = [] } = trpc.symbols.list.useQuery();
  const utils = trpc.useUtils();
  const openPositions = useMemo(
    () => positions.filter((position) => position.openQty > 0),
    [positions],
  );

  const maxQuantity = view.metrics?.state.quantity ?? 0;
  const plannedQuantity = plan && plan.sessionId === view.detail?.id
    ? Math.min(plan.quantity, maxQuantity)
    : maxQuantity;
  const setPlannedQuantity = (quantity: number) => {
    if (!view.detail) return;
    setPlan({ sessionId: view.detail.id, quantity });
  };
  const canonicalCurrency = sessionCurrency(view.detail?.currencyCode);
  const displayCurrency = display && display.sessionId === view.detail?.id
    ? display.currency
    : canonicalCurrency;
  const conversionFactor = currencyFactor(
    canonicalCurrency,
    displayCurrency,
    view.usdPerEur,
  );
  const setDisplayCurrency = (currency: SessionCurrency) => {
    if (!view.detail) return;
    setDisplay({ sessionId: view.detail.id, currency });
  };

  const closeMutation = trpc.tradingSessions.close.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tradingSessions.list.invalidate(),
        view.selectedId
          ? utils.tradingSessions.get.invalidate({ id: view.selectedId })
          : Promise.resolve(),
      ]);
      toast.success("Trading session ended");
    },
    onError: (error) => toast.error(error.message || "Trading session could not be ended"),
  });

  const endSession = () => {
    if (!view.selectedId) return;
    closeMutation.mutate({ id: view.selectedId, endedAt: new Date().toISOString() });
  };

  const loading = view.sessionsQuery.isLoading
    || (Boolean(view.selectedId) && view.detailQuery.isLoading);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <SessionHeader
        sessions={view.sessions}
        selectedId={view.selectedId}
        onSelect={view.setSelectedId}
        onCreate={() => setCreateOpen(true)}
        onClose={endSession}
        isClosing={closeMutation.isPending}
      />

      {loading ? (
        <SessionLoading />
      ) : view.sessions.length === 0 ? (
        <SessionEmptyState onCreate={() => setCreateOpen(true)} />
      ) : view.detail && view.metrics ? (
        <>
          {view.metrics.shortfall && (
            <div role="alert" className="flex items-start gap-3 rounded-lg border border-[color:var(--negative)]/30 bg-[color:var(--negative-soft)] p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--negative)]" />
              Session history has an invalid sell order. Delete or correct the action that exceeds
              available quantity by {view.metrics.shortfall.quantity.toFixed(8)}.
            </div>
          )}
          <SessionSummary
            metrics={view.metrics}
            currentPrice={view.currentPrice}
            displayCurrency={displayCurrency}
            conversionFactor={conversionFactor}
          />
          <SessionInputs
            key={view.detail.id}
            session={view.detail}
            usdPerEur={view.usdPerEur}
            displayCurrency={displayCurrency}
            onDisplayCurrencyChange={setDisplayCurrency}
          />

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <PriceLadder
              currentPrice={view.currentPrice * conversionFactor}
              averageCost={view.metrics.state.averageCost * conversionFactor}
              availableQuantity={view.metrics.state.quantity}
              plannedQuantity={plannedQuantity}
              onPlannedQuantityChange={setPlannedQuantity}
              currencyCode={displayCurrency}
            />
            <div className="flex flex-col gap-4">
              <TargetPriceCard
                quantity={plannedQuantity}
                maxQuantity={view.metrics.state.quantity}
                onQuantityChange={setPlannedQuantity}
                averageCost={view.metrics.state.averageCost * conversionFactor}
                currentPrice={view.currentPrice * conversionFactor}
                currencyCode={displayCurrency}
              />
              <SessionEventForm
                key={`${view.detail.id}:${view.currentPrice}`}
                sessionId={view.detail.id}
                availableQuantity={view.metrics.state.quantity}
                currentPrice={view.currentPrice}
                isActive={view.detail.status === "active"}
                currencyCode={canonicalCurrency}
              />
            </div>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-2">
            <SessionActivity
              session={view.detail}
              snapshots={view.metrics.snapshots}
              displayCurrency={displayCurrency}
              conversionFactor={conversionFactor}
            />
            <AcquisitionLots
              session={view.detail}
              displayCurrency={displayCurrency}
              conversionFactor={conversionFactor}
            />
          </div>
        </>
      ) : (
        <div role="alert" className="rounded-lg border border-[color:var(--negative)]/30 bg-[color:var(--negative-soft)] p-4 text-sm">
          This trading session could not be loaded. Refresh the page and try again.
        </div>
      )}

      {createOpen && (
        <CreateSessionDialog
          open
          onOpenChange={setCreateOpen}
          positions={openPositions}
          platforms={platforms}
          symbols={symbols}
          onCreated={view.setSelectedId}
        />
      )}
    </div>
  );
}

function SessionLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) =>
          <Skeleton key={index} className="h-[96px]" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[720px]" />
        <Skeleton className="h-[520px]" />
      </div>
    </div>
  );
}
