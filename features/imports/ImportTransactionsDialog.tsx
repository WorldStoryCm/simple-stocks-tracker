"use client";

import { useState } from "react";
import { FileUp, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/dialog";
import { Input } from "@/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { trpc } from "@/lib/trpc";
import { ImportPreviewTable } from "./components/ImportPreviewTable";
import { ImportSummaryStrip } from "./components/ImportSummaryStrip";
import type { ImportPreview } from "./types";

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
  const { data: platforms } = trpc.platforms.list.useQuery();
  const utils = trpc.useUtils();

  function resetFileState() {
    setFileName("");
    setFileContent("");
    setPreview(undefined);
    setSelected(new Set());
  }

  const previewMutation = trpc.imports.preview.useMutation({
    onSuccess: (result) => {
      const nextPreview = result as ImportPreview;
      setPreview(nextPreview);
      setSelected(new Set(nextPreview.rows.filter((row) => row.status === "new").map((row) => row.rowHash)));
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
      utils.performance.stats.invalidate();
      resetFileState();
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message || "Import failed"),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        accessibleTitle="Import transactions"
        className="w-[calc(100vw-1rem)] max-w-[1120px] max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:p-6"
      >
        <DialogHeader title="Import Activity" />
        <div className="grid gap-4 pt-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_180px]">
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

            <Button type="button" variant="outline" disabled={!platformId || !fileContent || pending} onClick={runPreview}>
              <Upload className="mr-1.5 h-4 w-4" />
              Preview
            </Button>
          </div>

          <label className="flex min-h-[76px] cursor-pointer items-center gap-3 rounded-md border border-dashed border-border bg-[color:var(--surface-1)] px-4 py-3 hover:bg-[color:var(--surface-2)]/60">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[color:var(--surface-2)] text-text-secondary">
              <FileUp className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text-primary">{fileName || "Choose export file"}</span>
              <span className="block truncate text-xs text-text-tertiary">CSV, XLSX, XLS, or PDF</span>
            </span>
            <Input
              type="file"
              accept=".csv,.txt,.xlsx,.xls,.pdf"
              className="sr-only"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>

          <ImportSummaryStrip preview={preview} selectedCount={selected.size} />
          <ImportPreviewTable rows={preview?.rows ?? []} selected={selected} toggle={toggle} />
        </div>

        <DialogFooter className="pt-2">
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
