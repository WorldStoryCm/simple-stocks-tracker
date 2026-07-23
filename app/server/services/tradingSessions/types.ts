export type TradingSessionCreateInput = {
  platformId: string;
  symbolId: string;
  openingSource: "position" | "manual";
  openingQuantity?: string;
  openingAverageCost?: string;
  openingMarketPrice: string;
  currencyCode: "USD" | "EUR";
  usdPerEur?: string;
  startedAt: string;
  notes?: string;
};

export type TradingSessionInputsUpdate = {
  id: string;
  openingAverageCost: string;
  openingMarketPrice: string;
  manualMarkPrice: string;
  currencyCode: "USD" | "EUR";
  usdPerEur: string;
};

export type TradingSessionEventInput = {
  sessionId: string;
  eventType: "buy" | "sell";
  executedAt: string;
  quantity: string;
  price: string;
  fee: string;
  notes?: string;
};

export type OpeningLotDraft = {
  sourceTradeId?: string;
  acquiredAt?: Date;
  quantity: string;
  unitPrice: string;
};

export type OpeningSnapshot = {
  quantity: string;
  totalCost: string;
  lots: OpeningLotDraft[];
};
