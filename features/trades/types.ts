export type Trade = {
  id: string;
  tradeDate: string;
  executedAt?: string | null;
  tradeType: "buy" | "sell";
  symbol: { ticker: string };
  platform: { name: string };
  price: string | number;
  quantity: string | number;
  currencyCode?: string;
  realizedPnl?: string | number | null;
};

export type SortField =
  | "tradeDate"
  | "symbolId"
  | "platformId"
  | "tradeType"
  | "price"
  | "quantity"
  | "total";

export type SortDir = "asc" | "desc";

export type TradeSymbolOption = {
  id: string;
  ticker: string;
};

export type TradePlatformOption = {
  id: string;
  name: string;
};
