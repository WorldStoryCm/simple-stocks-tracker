export type SourceSystem = "revolut" | "ibkr" | "n26" | "manual";

export type ImportKind = "trade" | "cash_event" | "corporate_action" | "ignored" | "unsupported";

export type ImportStatus =
  | "new"
  | "matched"
  | "possible_match"
  | "needs_review"
  | "ignored"
  | "imported"
  | "error";

export type NormalizedImportRow = {
  rowIndex: number;
  rowHash: string;
  raw: Record<string, string>;
  kind: ImportKind;
  sourceType: string;
  date?: string;
  executedAt?: string;
  executionOrder?: number;
  ticker?: string;
  tradeType?: "buy" | "sell";
  corporateActionType?: "stock_split" | "merger_stock";
  eventType?: "dividend" | "dividend_tax" | "fee" | "fee_reversal" | "deposit" | "withdrawal" | "transfer" | "other";
  quantity?: number;
  price?: number;
  fee?: number;
  amount?: number;
  cashImpact?: number;
  currencyCode?: string;
  fxRate?: number;
  importable: boolean;
  message?: string;
  positionAdjustment?: {
    quantity: number;
    price: number;
    reason: string;
  };
};

export type PreviewMatch = {
  id: string;
  kind: "trade" | "cash_event";
  confidence: number;
  reason: string;
  recordLabel?: string;
};

export type PreviewImportRow = NormalizedImportRow & {
  status: ImportStatus;
  confidence: number;
  matched?: PreviewMatch;
  willCreateSymbol?: boolean;
};

export type ImportPreview = {
  sourceSystem: SourceSystem;
  fileName: string;
  fileHash: string;
  rows: PreviewImportRow[];
  summary: Record<ImportStatus, number>;
};

export type ImportCommitResult = {
  batchId: string;
  imported: number;
  skipped: number;
  errors: string[];
};
