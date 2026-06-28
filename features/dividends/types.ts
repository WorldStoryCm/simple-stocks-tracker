export type DividendEvent = {
  id: string;
  eventDate: string;
  eventType: "dividend" | "dividend_tax";
  amount: string | number;
  currencyCode: string;
  sourceSystem?: string | null;
  sourceType?: string | null;
  notes?: string | null;
  platform?: { name?: string | null } | null;
  symbol?: { ticker?: string | null } | null;
};

export type DividendPlatformOption = {
  id: string;
  name: string;
};

export type DividendSymbolOption = {
  id: string;
  ticker: string;
};
