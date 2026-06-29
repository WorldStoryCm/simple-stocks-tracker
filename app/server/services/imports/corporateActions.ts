import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { symbols, trades, tradeLotMatches } from "@/db/schema";
import type { PreviewImportRow } from "./types";

const ZERO_EPSILON = 0.000001;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CorporateActionAdjustment = {
  tradeId: string;
  oldQuantity: string;
  oldPrice: string;
  newQuantity: string;
  newPrice: string;
};

type CorporateActionLot = {
  tradeId: string;
  quantity: string | number;
  price: string | number;
  matchedQuantity: number;
};

type WriteMergerParams = {
  tx: Tx;
  userId: string;
  platformId: string;
  sourceSystem: string;
  rows: PreviewImportRow[];
};

function closeEnough(left: number, right: number) {
  return Math.abs(left - right) <= ZERO_EPSILON;
}

export function buildCorporateActionAdjustments(rowIndex: number, lots: CorporateActionLot[], quantityDelta: number) {
  const lotStates = lots.map((lot) => ({
    ...lot,
    openQuantity: Number(lot.quantity) - lot.matchedQuantity,
  }));
  const totalOpen = lotStates.reduce((sum, lot) => sum + Math.max(0, lot.openQuantity), 0);
  const nextOpen = totalOpen + quantityDelta;
  if (totalOpen <= ZERO_EPSILON || nextOpen <= ZERO_EPSILON || closeEnough(totalOpen, nextOpen)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Row ${rowIndex} cannot apply a stock adjustment to current open quantity ${totalOpen.toFixed(8)}.`,
    });
  }

  const factor = nextOpen / totalOpen;
  return {
    factor,
    adjustments: lotStates
      .filter((lot) => lot.openQuantity > ZERO_EPSILON)
      .map((lot) => ({
        tradeId: lot.tradeId,
        oldQuantity: String(lot.quantity),
        oldPrice: String(lot.price),
        newQuantity: (lot.matchedQuantity + lot.openQuantity * factor).toFixed(8),
        newPrice: (Number(lot.price) / factor).toFixed(4),
      })),
  };
}

export async function applyCorporateActionRow({
  tx,
  userId,
  platformId,
  row,
}: {
  tx: Tx;
  userId: string;
  platformId: string;
  row: PreviewImportRow;
}) {
  if (!row.ticker || !row.date || row.quantity == null) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Row ${row.rowIndex} is missing corporate action values.` });
  }

  const symbol = await tx.query.symbols.findFirst({
    where: and(eq(symbols.userId, userId), eq(symbols.ticker, row.ticker)),
  });
  if (!symbol) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Row ${row.rowIndex} cannot adjust lots before a symbol exists.` });
  }

  const buyLots = await tx.query.trades.findMany({
    where: and(
      eq(trades.userId, userId),
      eq(trades.platformId, platformId),
      eq(trades.symbolId, symbol.id),
      eq(trades.tradeType, "buy"),
    ),
    orderBy: [asc(trades.tradeDate), asc(trades.createdAt)],
  });
  const buyIds = new Set(buyLots.map((buy) => buy.id));
  const matches = buyIds.size
    ? await tx.query.tradeLotMatches.findMany({ where: eq(tradeLotMatches.userId, userId) })
    : [];

  const lots = buyLots.map((buy) => {
    const matchedQuantity = matches
      .filter((match) => match.buyTradeId === buy.id)
      .reduce((sum, match) => sum + Number(match.matchedQuantity), 0);
    return {
      tradeId: buy.id,
      quantity: buy.quantity,
      price: buy.price,
      matchedQuantity,
    };
  });

  const result = buildCorporateActionAdjustments(row.rowIndex, lots, row.quantity);
  for (const adjustment of result.adjustments) {
    await tx.update(trades)
      .set({ quantity: adjustment.newQuantity, price: adjustment.newPrice })
      .where(and(eq(trades.id, adjustment.tradeId), eq(trades.userId, userId)));
  }

  return result;
}

async function ensureSymbol(tx: Tx, userId: string, ticker: string, currencyCode: string) {
  const existing = await tx.query.symbols.findFirst({
    where: and(eq(symbols.userId, userId), eq(symbols.ticker, ticker)),
  });
  if (existing) return existing;

  const [created] = await tx.insert(symbols).values({
    userId,
    ticker,
    currencyCode,
    notes: "Created during broker import",
  }).returning();
  return created;
}

async function openLotsForTicker(tx: Tx, userId: string, platformId: string, ticker: string) {
  const symbol = await tx.query.symbols.findFirst({
    where: and(eq(symbols.userId, userId), eq(symbols.ticker, ticker)),
  });
  if (!symbol) return [];

  const buyLots = await tx.query.trades.findMany({
    where: and(
      eq(trades.userId, userId),
      eq(trades.platformId, platformId),
      eq(trades.symbolId, symbol.id),
      eq(trades.tradeType, "buy"),
    ),
    orderBy: [asc(trades.tradeDate), asc(trades.createdAt)],
  });
  const buyIds = new Set(buyLots.map((buy) => buy.id));
  const matches = buyIds.size
    ? await tx.query.tradeLotMatches.findMany({ where: eq(tradeLotMatches.userId, userId) })
    : [];

  return buyLots.map((buy) => {
    const matchedQuantity = matches
      .filter((match) => match.buyTradeId === buy.id)
      .reduce((sum, match) => sum + Number(match.matchedQuantity), 0);
    return {
      tradeId: buy.id,
      quantity: buy.quantity,
      price: buy.price,
      matchedQuantity,
      openQuantity: Math.max(0, Number(buy.quantity) - matchedQuantity),
    };
  }).filter((lot) => lot.openQuantity > ZERO_EPSILON);
}

export async function applyMergerStockRows({ tx, userId, platformId, sourceSystem, rows }: WriteMergerParams) {
  const positiveRows = rows.filter((row) => (row.quantity ?? 0) > 0);
  const negativeRows = rows.filter((row) => (row.quantity ?? 0) < 0);
  if (positiveRows.length === 0 || negativeRows.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Merger rows must include source and target tickers." });
  }

  const adjustments: CorporateActionAdjustment[] = [];
  let transferredCost = 0;
  for (const row of negativeRows) {
    if (!row.ticker || row.quantity == null) continue;
    let remaining = Math.abs(row.quantity);
    const lots = await openLotsForTicker(tx, userId, platformId, row.ticker);

    for (const lot of lots) {
      if (remaining <= ZERO_EPSILON) break;
      const consumed = Math.min(lot.openQuantity, remaining);
      const remainingOpen = lot.openQuantity - consumed;
      const newQuantity = (lot.matchedQuantity + remainingOpen).toFixed(8);
      transferredCost += consumed * Number(lot.price);
      await tx.update(trades)
        .set({ quantity: newQuantity })
        .where(and(eq(trades.id, lot.tradeId), eq(trades.userId, userId)));
      adjustments.push({
        tradeId: lot.tradeId,
        oldQuantity: String(lot.quantity),
        oldPrice: String(lot.price),
        newQuantity,
        newPrice: String(lot.price),
      });
      remaining -= consumed;
    }

    if (remaining > ZERO_EPSILON) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Row ${row.rowIndex} has insufficient open quantity for merger. Short by ${remaining.toFixed(8)}.`,
      });
    }
  }

  const totalTargetQuantity = positiveRows.reduce((sum, row) => sum + Math.max(0, row.quantity ?? 0), 0);
  const unitCost = totalTargetQuantity > ZERO_EPSILON ? transferredCost / totalTargetQuantity : 0;
  const createdTrades: { rowHash: string; tradeId: string }[] = [];

  for (const row of positiveRows) {
    if (!row.ticker || !row.date || row.quantity == null) continue;
    const symbol = await ensureSymbol(tx, userId, row.ticker, row.currencyCode ?? "USD");
    const [trade] = await tx.insert(trades).values({
      userId,
      platformId,
      symbolId: symbol.id,
      tradeType: "buy",
      tradeDate: row.date,
      quantity: row.quantity.toFixed(8),
      price: unitCost.toFixed(4),
      fee: "0.0000",
      currencyCode: row.currencyCode ?? "USD",
      notes: `Imported from ${sourceSystem}: ${row.sourceType}`,
      sourceSystem,
      sourceRowHash: row.rowHash,
      importedAt: new Date(),
    }).returning();
    createdTrades.push({ rowHash: row.rowHash, tradeId: trade.id });
  }

  return { transferredCost, unitCost, adjustments, createdTrades };
}
