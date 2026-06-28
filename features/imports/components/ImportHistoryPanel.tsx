"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/button";
import { cn } from "@/components/component.utils";
import type { ImportBatch } from "../types";

function statusClass(status: ImportBatch["status"]) {
  if (status === "imported") return "text-[color:var(--positive)]";
  if (status === "rolled_back") return "text-text-tertiary";
  if (status === "failed") return "text-[color:var(--negative)]";
  return "text-text-secondary";
}

export function ImportHistoryPanel({
  batches,
  isLoading,
  isRollingBack,
  onRollback,
}: {
  batches: ImportBatch[];
  isLoading: boolean;
  isRollingBack: boolean;
  onRollback: (batchId: string) => void;
}) {
  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Recent imports</span>
      </div>
      <div className="max-h-[180px] overflow-y-auto">
        {isLoading ? (
          <div className="px-3 py-6 text-sm text-text-tertiary">Loading import history...</div>
        ) : batches.length === 0 ? (
          <div className="px-3 py-6 text-sm text-text-tertiary">No imports yet.</div>
        ) : (
          batches.map((batch) => (
            <div
              key={batch.id}
              className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border/60 px-3 py-2 last:border-0"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-text-primary">{batch.fileName}</span>
                  <span className={cn("text-xs font-medium", statusClass(batch.status))}>{batch.status.replace("_", " ")}</span>
                </div>
                <div className="mt-0.5 text-xs text-text-tertiary">
                  {batch.platform?.name ?? "Unknown platform"} / {batch.sourceSystem} / {batch.importedCount} imported / {batch.skippedCount} skipped
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={batch.status !== "imported" || batch.importedCount === 0 || isRollingBack}
                onClick={() => onRollback(batch.id)}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Rollback
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
