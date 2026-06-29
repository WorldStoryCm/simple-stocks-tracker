import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { cashEvents, importBatches, platforms, symbols, trades, tradeLotMatches } from "@/db/schema";
import { detectImportSourceSystem } from "@/lib/importSourceDetection";
import { sha256 } from "./hash";
import { classifyImportRow } from "./match";
import { parseRevolutCsv } from "./adapters/revolut";
import { parseManualCsv } from "./adapters/manual";
import { applyQuantityAvailability } from "./availability";
import type { ImportPreview, ImportStatus, NormalizedImportRow, SourceSystem } from "./types";

export type PreviewInput = {
  sourceSystem: SourceSystem;
  platformId: string;
  fileName: string;
  fileContent: string;
  replaceHistory?: boolean;
};

function parseRows(input: PreviewInput): { sourceSystem: SourceSystem; rows: NormalizedImportRow[] } {
  const sourceSystem = detectImportSourceSystem(input.fileName, input.fileContent) ?? input.sourceSystem;
  if (sourceSystem === "revolut") return { sourceSystem, rows: parseRevolutCsv(input.fileContent) };
  if (sourceSystem === "manual") return { sourceSystem, rows: parseManualCsv(input.fileContent) };
  throw new TRPCError({ code: "BAD_REQUEST", message: "This broker adapter is not implemented yet." });
}

function summarize(rows: { status: ImportStatus }[]) {
  const summary = {
    new: 0,
    matched: 0,
    possible_match: 0,
    needs_review: 0,
    ignored: 0,
    imported: 0,
    error: 0,
  };
  for (const row of rows) summary[row.status] += 1;
  return summary;
}

export async function buildPreview(userId: string, input: PreviewInput): Promise<ImportPreview> {
  const platform = await db.query.platforms.findFirst({
    where: and(eq(platforms.id, input.platformId), eq(platforms.userId, userId)),
  });
  if (!platform) throw new TRPCError({ code: "NOT_FOUND", message: "Platform not found" });

  const parsed = parseRows(input);
  const rows = parsed.rows;
  const [existingSymbols, existingTrades, existingCashEvents, existingBatches, existingMatches] = await Promise.all([
    db.query.symbols.findMany({ where: eq(symbols.userId, userId) }),
    db.query.trades.findMany({
      where: and(eq(trades.userId, userId), eq(trades.platformId, input.platformId)),
      with: { symbol: true },
    }),
    db.query.cashEvents.findMany({
      where: and(eq(cashEvents.userId, userId), eq(cashEvents.platformId, input.platformId)),
      with: { symbol: true },
    }),
    db.query.importBatches.findMany({
      where: and(
        eq(importBatches.userId, userId),
        eq(importBatches.platformId, input.platformId),
        eq(importBatches.sourceSystem, parsed.sourceSystem),
        eq(importBatches.status, "imported"),
      ),
      with: { rows: true },
    }),
    db.query.tradeLotMatches.findMany({ where: eq(tradeLotMatches.userId, userId) }),
  ]);

  const symbolTickers = new Set(existingSymbols.map((symbol) => symbol.ticker.toUpperCase()));
  const initialOpenByTicker = buildInitialOpenByTicker(input.replaceHistory === true ? [] : existingTrades, existingMatches);
  const existingImportRowHashes = input.replaceHistory === true
    ? new Set<string>()
    : new Set(
      existingBatches.flatMap((batch) => batch.rows.filter((row) => row.status === "imported").map((row) => row.rowHash)),
    );
  const matchTrades = input.replaceHistory === true ? [] : existingTrades;
  const matchCashEvents = input.replaceHistory === true ? [] : existingCashEvents;
  const previewRows = rows.map((row) =>
    classifyImportRow({
      row,
      sourceSystem: parsed.sourceSystem,
      trades: matchTrades,
      cashEvents: matchCashEvents,
      symbolExists: row.ticker ? symbolTickers.has(row.ticker) : false,
      existingImportRowHashes,
    }),
  );
  const availableRows = applyQuantityAvailability(previewRows, initialOpenByTicker);

  return {
    sourceSystem: parsed.sourceSystem,
    fileName: input.fileName,
    fileHash: sha256(input.fileContent),
    rows: availableRows,
    summary: summarize(availableRows),
  };
}

function buildInitialOpenByTicker(
  existingTrades: {
    id: string;
    tradeType: "buy" | "sell";
    quantity: string | number;
    symbol?: { ticker: string } | null;
  }[],
  existingMatches: { buyTradeId: string; matchedQuantity: string | number }[],
) {
  const matchedByBuyId = new Map<string, number>();
  for (const match of existingMatches) {
    matchedByBuyId.set(match.buyTradeId, (matchedByBuyId.get(match.buyTradeId) ?? 0) + Number(match.matchedQuantity));
  }

  const openByTicker = new Map<string, number>();
  for (const trade of existingTrades) {
    if (trade.tradeType !== "buy") continue;
    const ticker = trade.symbol?.ticker;
    if (!ticker) continue;
    const open = Number(trade.quantity) - (matchedByBuyId.get(trade.id) ?? 0);
    openByTicker.set(ticker, (openByTicker.get(ticker) ?? 0) + Math.max(0, open));
  }
  return openByTicker;
}
