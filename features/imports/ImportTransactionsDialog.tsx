"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/dialog";
import { trpc } from "@/lib/trpc";
import { ImportControls } from "./components/ImportControls";
import { ImportHistoryPanel } from "./components/ImportHistoryPanel";
import { ImportPreviewTable } from "./components/ImportPreviewTable";
import { ImportSummaryStrip, type ImportFilter } from "./components/ImportSummaryStrip";
import { defaultSelectedRows } from "./importDialogUtils";
import type { ImportBatch, ImportPreview, SourceSystem } from "./types";

export function ImportTransactionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [sourceSystem, setSourceSystem] = useState<SourceSystem>("revolut");
  const [platformId, setPlatformId] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [preview, setPreview] = useState<ImportPreview | undefined>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<ImportFilter>("all");
  const [replaceHistory, setReplaceHistory] = useState(false);
  const { data: platforms } = trpc.platforms.list.useQuery();
  const { data: history, isLoading: historyLoading } = trpc.imports.history.useQuery(undefined, { enabled: open });
  const utils = trpc.useUtils();

  function resetFileState() {
    setFileName("");
    setFileContent("");
    setPreview(undefined);
    setSelected(new Set());
    setStatusFilter("all");
  }

  const previewMutation = trpc.imports.preview.useMutation({
    onSuccess: (result, variables) => {
      const nextPreview = result as ImportPreview;
      setPreview(nextPreview);
      setSelected(new Set(defaultSelectedRows(nextPreview.rows, variables.replaceHistory === true).map((row) => row.rowHash)));
      setStatusFilter("all");
    },
    onError: (error) => toast.error(error.message || "Import preview failed"),
  });

  const commitMutation = trpc.imports.commit.useMutation({
    onSuccess: (result) => {
      toast.success(`Imported ${result.imported} rows`);
      utils.trades.list.invalidate();
      utils.positions.list.invalidate();
      utils.platforms.list.invalidate();
      utils.symbols.list.invalidate();
      utils.dividends.list.invalidate();
      utils.dividends.summary.invalidate();
      utils.imports.history.invalidate();
      utils.performance.stats.invalidate();
      resetFileState();
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message || "Import failed"),
  });

  const rollbackMutation = trpc.imports.rollback.useMutation({
    onSuccess: (result) => {
      toast.success(`Rolled back ${result.tradeRowsDeleted + result.cashEventsDeleted} imported rows`);
      utils.trades.list.invalidate();
      utils.positions.list.invalidate();
      utils.platforms.list.invalidate();
      utils.dividends.list.invalidate();
      utils.dividends.summary.invalidate();
      utils.imports.history.invalidate();
      utils.performance.stats.invalidate();
    },
    onError: (error) => toast.error(error.message || "Rollback failed"),
  });

  async function handleFile(file?: File) {
    resetFileState();
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("This adapter currently expects a CSV import file.");
      return;
    }
    setFileContent(await file.text());
  }

  function runPreview(nextReplaceHistory = replaceHistory) {
    if (!platformId || !fileContent) {
      toast.error("Choose a platform and file first");
      return;
    }
    previewMutation.mutate({ sourceSystem, platformId, fileName, fileContent, replaceHistory: nextReplaceHistory });
  }

  function runCommit() {
    if (!platformId || !fileContent || selected.size === 0) return;
    commitMutation.mutate({
      sourceSystem,
      platformId,
      fileName,
      fileContent,
      selectedRowHashes: [...selected],
      replaceHistory,
    });
  }

  function handleReplaceHistory(checked: boolean) {
    setReplaceHistory(checked);
    if (preview && platformId && fileContent) {
      runPreview(checked);
    } else if (preview) {
      setSelected(new Set(defaultSelectedRows(preview.rows, checked).map((row) => row.rowHash)));
    }
  }

  function toggle(rowHash: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(rowHash);
      else next.delete(rowHash);
      return next;
    });
  }

  const pending = previewMutation.isPending || commitMutation.isPending;
  const visibleRows = preview?.rows.filter((row) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "selected") return selected.has(row.rowHash);
    return row.status === statusFilter;
  }) ?? [];
  const historyBatches = (history ?? []) as ImportBatch[];
  const showHistory = !preview && historyBatches.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        accessibleTitle="Import transactions"
        className="left-0 top-0 flex h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-3 overflow-hidden rounded-none border-0 p-4 shadow-none sm:rounded-none sm:p-5"
      >
        <DialogHeader title="Import Activity" className="shrink-0 pb-3" />
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <ImportControls
            sourceSystem={sourceSystem}
            platformId={platformId}
            platforms={platforms}
            fileName={fileName}
            pending={pending || !fileContent}
            onSourceChange={(nextSource) => {
              if (nextSource === sourceSystem) return;
              setSourceSystem(nextSource);
              resetFileState();
            }}
            onPlatformChange={(value) => {
              setPlatformId(value);
              setPreview(undefined);
              setSelected(new Set());
            }}
            onFile={handleFile}
            onPreview={runPreview}
          />

          <label className="flex items-start gap-2 rounded-md border border-border bg-[color:var(--surface-1)] px-3 py-2 text-xs text-text-tertiary">
            <Checkbox
              checked={replaceHistory}
              onCheckedChange={(value) => handleReplaceHistory(value === true)}
              aria-label="Replace existing platform history before import"
            />
            <span>
              <span className="font-medium text-text-primary">Replace platform data</span>
              {" "}deletes this platform&apos;s existing trades, cash events, and import history, then imports all importable rows from this file.
              Use Export Trades before replacing data.
            </span>
          </label>

          <ImportSummaryStrip
            preview={preview}
            selectedCount={selected.size}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
          />
          <ImportPreviewTable
            rows={visibleRows}
            selected={selected}
            toggle={toggle}
            replaceHistory={replaceHistory}
            className="min-h-[360px] flex-1"
          />
          {showHistory && (
            <ImportHistoryPanel
              batches={historyBatches}
              isLoading={historyLoading}
              isRollingBack={rollbackMutation.isPending}
              onRollback={(batchId) => rollbackMutation.mutate({ batchId })}
            />
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border pt-3">
          <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={selected.size === 0 || pending} onClick={runCommit}>
            {commitMutation.isPending
              ? "Importing..."
              : replaceHistory ? `Replace Data With ${selected.size} Rows` : `Import ${selected.size} Rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
