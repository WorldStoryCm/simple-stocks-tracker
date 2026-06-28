"use client";

import { useState } from "react";
import { FileUp, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { trpc } from "@/lib/trpc";
import { ImportHistoryPanel } from "./components/ImportHistoryPanel";
import { ImportPreviewTable } from "./components/ImportPreviewTable";
import { ImportSummaryStrip, type ImportFilter } from "./components/ImportSummaryStrip";
import type { ImportBatch, ImportPreview } from "./types";

export function ImportTransactionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [sourceSystem, setSourceSystem] = useState<"revolut" | "ibkr" | "n26">("revolut");
  const [platformId, setPlatformId] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [preview, setPreview] = useState<ImportPreview | undefined>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<ImportFilter>("all");
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
    onSuccess: (result) => {
      const nextPreview = result as ImportPreview;
      setPreview(nextPreview);
      setSelected(new Set(nextPreview.rows.filter((row) => row.status === "new").map((row) => row.rowHash)));
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
      toast.error("This adapter currently expects a CSV export.");
      return;
    }
    setFileContent(await file.text());
  }

  function runPreview() {
    if (!platformId || !fileContent) {
      toast.error("Choose a platform and file first");
      return;
    }
    previewMutation.mutate({ sourceSystem, platformId, fileName, fileContent });
  }

  function runCommit() {
    if (!platformId || !fileContent || selected.size === 0) return;
    commitMutation.mutate({
      sourceSystem,
      platformId,
      fileName,
      fileContent,
      selectedRowHashes: [...selected],
    });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        accessibleTitle="Import transactions"
        className="left-0 top-0 flex h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-4 overflow-hidden rounded-none border-0 p-4 shadow-none sm:rounded-none sm:p-6"
      >
        <DialogHeader title="Import Activity" className="shrink-0 pb-3" />
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[160px_200px_minmax(260px,1fr)_160px]">
            <Select
              value={sourceSystem}
              onValueChange={(value) => {
                setSourceSystem(value as "revolut" | "ibkr" | "n26");
                resetFileState();
              }}
            >
              <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="revolut">Revolut</SelectItem>
                <SelectItem value="ibkr">IBKR</SelectItem>
                <SelectItem value="n26">N26</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={platformId}
              onValueChange={(value) => {
                setPlatformId(value);
                setPreview(undefined);
                setSelected(new Set());
              }}
            >
              <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>
                {platforms?.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>{platform.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="flex h-8 min-w-0 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-[color:var(--surface-1)] px-3 text-sm hover:bg-[color:var(--surface-2)]/60">
              <FileUp className="h-4 w-4 shrink-0 text-text-tertiary" />
              <span className="min-w-0 flex-1 truncate text-text-primary">{fileName || "Choose CSV export"}</span>
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>

            <Button type="button" variant="outline" disabled={!platformId || !fileContent || pending} onClick={runPreview}>
              <Upload className="mr-1.5 h-4 w-4" />
              Preview
            </Button>
          </div>

          <ImportSummaryStrip
            preview={preview}
            selectedCount={selected.size}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
          />
          <ImportPreviewTable rows={visibleRows} selected={selected} toggle={toggle} className="min-h-0 flex-1" />
          <ImportHistoryPanel
            batches={(history ?? []) as ImportBatch[]}
            isLoading={historyLoading}
            isRollingBack={rollbackMutation.isPending}
            onRollback={(batchId) => rollbackMutation.mutate({ batchId })}
          />
        </div>

        <DialogFooter className="shrink-0 border-t border-border pt-3">
          <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={selected.size === 0 || pending} onClick={runCommit}>
            {commitMutation.isPending ? "Importing..." : `Import ${selected.size} Rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
