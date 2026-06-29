export type ImportStatus =
  | "new"
  | "matched"
  | "possible_match"
  | "needs_review"
  | "ignored"
  | "imported"
  | "error";

export type SourceSystem = "revolut" | "ibkr" | "n26" | "manual";

export type ImportPreviewRow = {
  rowIndex: number;
  rowHash: string;
  kind: "trade" | "cash_event" | "corporate_action" | "ignored" | "unsupported";
  status: ImportStatus;
  confidence: number;
  sourceType: string;
  importable: boolean;
  date?: string;
  ticker?: string;
  tradeType?: "buy" | "sell";
  corporateActionType?: "stock_split" | "merger_stock";
  eventType?: string;
  quantity?: number;
  price?: number;
  fee?: number;
  amount?: number;
  cashImpact?: number;
  currencyCode?: string;
  message?: string;
  positionAdjustment?: {
    quantity: number;
    price: number;
    reason: string;
  };
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
  sourceSystem: SourceSystem;
  fileName: string;
  fileHash: string;
  rows: ImportPreviewRow[];
  summary: Record<ImportStatus, number>;
};

export type ImportBatch = {
  id: string;
  sourceSystem: SourceSystem;
  fileName: string;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  status: "previewed" | "imported" | "failed" | "rolled_back";
  createdAt: string | Date;
  platform?: { name?: string | null } | null;
};
