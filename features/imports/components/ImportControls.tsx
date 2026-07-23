"use client";

import { FileUp, Upload } from "lucide-react";
import { Button } from "@/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import type { SourceSystem } from "../types";

type PlatformOption = {
  id: string;
  name: string;
};

export function ImportControls({
  sourceSystem,
  platformId,
  platforms,
  fileName,
  pending,
  onSourceChange,
  onPlatformChange,
  onFile,
  onPreview,
}: {
  sourceSystem: SourceSystem;
  platformId: string;
  platforms?: PlatformOption[];
  fileName: string;
  pending: boolean;
  onSourceChange: (source: SourceSystem) => void;
  onPlatformChange: (platformId: string) => void;
  onFile: (file?: File) => void;
  onPreview: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-[140px_170px_minmax(220px,1fr)_136px]">
      <Select value={sourceSystem} onValueChange={(value) => onSourceChange(value as SourceSystem)}>
        <SelectTrigger className="h-9"><SelectValue placeholder="Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="revolut">Revolut</SelectItem>
          <SelectItem value="manual">Manual CSV</SelectItem>
          <SelectItem value="ibkr">IBKR</SelectItem>
          <SelectItem value="n26">N26</SelectItem>
        </SelectContent>
      </Select>

      <Select value={platformId} onValueChange={onPlatformChange}>
        <SelectTrigger className="h-9"><SelectValue placeholder="Platform" /></SelectTrigger>
        <SelectContent>
          {platforms?.map((platform) => (
            <SelectItem key={platform.id} value={platform.id}>{platform.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label className="col-span-2 flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-[color:var(--surface-1)] px-3 text-sm hover:bg-[color:var(--surface-2)]/60 md:col-span-1">
        <FileUp className="h-4 w-4 shrink-0 text-text-tertiary" />
        <span className="min-w-0 flex-1 truncate text-text-primary">{fileName || "Choose CSV import"}</span>
        <input
          type="file"
          accept=".csv,.txt,.xlsx,.xls,.pdf"
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            onFile(file);
          }}
        />
      </label>

      <Button
        type="button"
        variant="outline"
        className="col-span-2 h-9 px-3 md:col-span-1"
        disabled={!platformId || !fileName || pending}
        onClick={() => onPreview()}
      >
        <Upload className="mr-1.5 h-4 w-4" />
        Preview
      </Button>
    </div>
  );
}
