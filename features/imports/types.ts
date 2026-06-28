export type ImportStatus =
  | "new"
  | "matched"
  | "possible_match"
  | "needs_review"
  | "ignored"
  | "imported"
  | "error";

export type ImportPreviewRow = {
  rowIndex: number;
  rowHash: string;
  kind: "trade" | "cash_event" | "corporate_action" | "ignored" | "unsupported";
  status: ImportStatus;
  confidence: number;
  sourceType: string;
  date?: string;
  ticker?: string;
  tradeType?: "buy" | "sell";
  eventType?: string;
  quantity?: number;
  price?: number;
  amount?: number;
  cashImpact?: number;
  currencyCode?: string;
  message?: string;
  matched?: {
    id: string;
    kind: "trade" | "cash_event";
    confidence: number;
    reason: string;
    recordLabel?: string;
  };
  willCreateSymbol?: boolean;
};

export type ImportPreview = {
  sourceSystem: "revolut" | "ibkr" | "n26";
  fileName: string;
  fileHash: string;
  rows: ImportPreviewRow[];
  summary: Record<ImportStatus, number>;
};

export type ImportBatch = {
  id: string;
  sourceSystem: "revolut" | "ibkr" | "n26";
  fileName: string;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  status: "previewed" | "imported" | "failed" | "rolled_back";
  createdAt: string | Date;
  platform?: { name?: string | null } | null;
};
