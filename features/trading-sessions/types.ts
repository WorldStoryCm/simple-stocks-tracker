import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/app/server/routers/_app";

type Outputs = inferRouterOutputs<AppRouter>;

export type TradingSessionListItem = Outputs["tradingSessions"]["list"][number];
export type TradingSessionDetail = Outputs["tradingSessions"]["get"];
export type PositionOption = Outputs["positions"]["list"][number];

export type QuoteMap = Record<string, {
  price?: number;
  change?: number;
  changePercent?: number;
  currency?: string;
  error?: string;
}>;
