import { symbols } from "@/db/schema";

export type NewsFeedInput = {
  limitSymbols?: number;
  newsPerSymbol?: number;
  scope?: NewsFeedScope;
};

export type NewsFeedScope = "all" | "active" | "owned_before";

export type CompanyEventType =
  | "earnings"
  | "earnings_call"
  | "ex_dividend"
  | "dividend_payable";

export type CompanyEvent = {
  id: string;
  ticker: string;
  companyName: string | null;
  type: CompanyEventType;
  title: string;
  date: string;
  isEstimate: boolean;
  details: string | null;
  source: "Yahoo Finance";
  url: string;
};

export type CompanyNewsItem = {
  id: string;
  ticker: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
  imageUrl: string | null;
  relatedTickers: string[];
  source: "Yahoo Finance";
};

export type SymbolRow = typeof symbols.$inferSelect;

export type YahooCalendarSummary = {
  calendarEvents?: {
    earnings?: {
      earningsDate?: unknown[];
      earningsCallDate?: unknown[];
      isEarningsDateEstimate?: boolean;
      earningsAverage?: number;
      earningsLow?: number;
      earningsHigh?: number;
      revenueAverage?: number;
    };
    exDividendDate?: unknown;
    dividendDate?: unknown;
  };
};

export type RawSearchNews = {
  uuid?: unknown;
  title?: unknown;
  publisher?: unknown;
  link?: unknown;
  providerPublishTime?: unknown;
  thumbnail?: {
    resolutions?: Array<{ url?: unknown; width?: unknown; height?: unknown }>;
  };
  relatedTickers?: unknown;
};

export type RawSearchResult = {
  news?: RawSearchNews[];
};
