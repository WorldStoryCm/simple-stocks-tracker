"use client";

import { trpc } from "@/lib/trpc";
import { RefreshCw } from "lucide-react";
import { cn } from "@/components/component.utils";
import { formatDistanceToNowStrict, format } from "date-fns";

type SyncState = "synced" | "refreshing" | "delayed" | "idle";

const DELAYED_MINUTES = 60;

function stateFor(syncedAt: Date | null, isFetching: boolean): SyncState {
  if (isFetching) return "refreshing";
  if (!syncedAt) return "idle";
  const ageMin = (Date.now() - syncedAt.getTime()) / 60000;
  return ageMin > DELAYED_MINUTES ? "delayed" : "synced";
}

const STATE_DOT: Record<SyncState, string> = {
  synced: "bg-[color:var(--positive)] shadow-[0_0_0_3px_var(--positive-soft)]",
  refreshing: "bg-[color:var(--info)] animate-pulse",
  delayed: "bg-[color:var(--warning)]",
  idle: "bg-[color:var(--text-tertiary)]",
};

const STATE_LABEL: Record<SyncState, string> = {
  synced: "Synced",
  refreshing: "Refreshing",
  delayed: "Delayed",
  idle: "Idle",
};

export function SyncStatus({ className }: { className?: string }) {
  const { data, isFetching } = trpc.rsi.lastSyncedAt.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const syncedAt = data?.syncedAt ? new Date(data.syncedAt) : null;
  const state = stateFor(syncedAt, isFetching);

  const relative = syncedAt
    ? formatDistanceToNowStrict(syncedAt, { addSuffix: true })
    : "never";
  const absolute = syncedAt ? format(syncedAt, "MMM d, HH:mm") : "—";

  return (
    <div
      className={cn(
        "hidden sm:flex items-center gap-2 rounded-full border border-border bg-[color:var(--surface-1)] px-3 py-1 text-[11px] text-text-secondary",
        className,
      )}
      title={`Indicators synced ${absolute}`}
    >
      <RefreshCw
        className={cn(
          "h-3 w-3 text-text-tertiary",
          state === "refreshing" && "animate-spin",
        )}
      />
      <span className="tabular-nums">
        {state === "idle" ? "No sync yet" : `Last sync ${absolute}`}
      </span>
      <span className="flex items-center gap-1.5 border-l border-border pl-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", STATE_DOT[state])} />
        <span>{STATE_LABEL[state]}</span>
      </span>
    </div>
  );
}
