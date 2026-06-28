"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import { Textarea } from "@/components/textarea";

type ExportFormat = "symbols" | "symbolsWithQty";

type ExportPosition = {
  symbol: {
    ticker: string;
  };
  openQty: number | string;
};

type ExportRow = {
  ticker: string;
  quantity: number;
};

const EXPORT_LABELS: Record<ExportFormat, string> = {
  symbols: "Symbols",
  symbolsWithQty: "Symbols + Shares",
};

function formatQuantity(quantity: number) {
  const fixed = quantity.toFixed(4);
  return fixed.replace(/\.?0+$/, "");
}

function getExportRows(positions: ExportPosition[]) {
  const rows = new Map<string, ExportRow>();

  for (const position of positions) {
    const ticker = position.symbol.ticker.trim();
    if (!ticker) continue;

    const existing = rows.get(ticker);
    const quantity = Number(position.openQty);
    rows.set(ticker, {
      ticker,
      quantity: (existing?.quantity ?? 0) + (Number.isFinite(quantity) ? quantity : 0),
    });
  }

  return Array.from(rows.values());
}

function formatExport(rows: ExportRow[], format: ExportFormat) {
  if (format === "symbols") {
    return rows.map((row) => row.ticker).join(", ");
  }

  return rows
    .map((row) => `${row.ticker}: ${formatQuantity(row.quantity)}`)
    .join("\n");
}

export function PositionsExportMenu({
  positions,
  isLoading,
}: {
  positions: ExportPosition[];
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("symbols");
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => getExportRows(positions), [positions]);
  const output = useMemo(() => formatExport(rows, format), [rows, format]);
  const disabled = isLoading || rows.length === 0;

  const openExport = (nextFormat: ExportFormat) => {
    setFormat(nextFormat);
    setCopied(false);
    setOpen(true);
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Copied export");
    } catch {
      toast.error("Could not copy export");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={disabled}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuItem onClick={() => openExport("symbols")}>
            Symbols
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openExport("symbolsWithQty")}>
            Symbols + shares
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[520px]">
          <DialogHeader title={EXPORT_LABELS[format]} />

          <div className="flex flex-col gap-3 pt-2">
            <Textarea
              readOnly
              value={output}
              className="min-h-[180px] resize-none font-mono text-sm"
              aria-label="Positions export output"
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="text-xs text-text-tertiary">
              {rows.length.toLocaleString()} symbols from current filters
            </div>
          </div>

          <DialogFooter className="pt-1">
            <Button onClick={copyOutput} disabled={!output}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
