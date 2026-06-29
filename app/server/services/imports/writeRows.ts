import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { cashEvents, platforms, symbols, trades } from "@/db/schema";
import { applyFifoMatch } from "../trades/fifo";
import { convertImportCashImpact } from "./currency";
import type { PreviewImportRow } from "./types";

const ZERO_EPSILON = 0.000001;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function ensureSymbol(tx: Tx, userId: string, ticker: string, currencyCode: string) {
  const normalized = ticker.toUpperCase();
  const existing = await tx.query.symbols.findFirst({
    where: and(eq(symbols.userId, userId), eq(symbols.ticker, normalized)),
  });
  if (existing) return existing;

  const [created] = await tx.insert(symbols).values({
    userId,
    ticker: normalized,
    currencyCode,
    notes: "Created during broker import",
  }).returning();
  return created;
}

type WriteRowParams = {
  tx: Tx;
  userId: string;
  platformId: string;
  row: PreviewImportRow;
  cashBalance: number;
  platformCurrency: string;
  rates: Record<string, number>;
  sourceSystem: string;
};

type PositionAdjustmentLotParams = Pick<WriteRowParams, "tx" | "userId" | "platformId" | "row" | "sourceSystem"> & {
  symbolId: string;
};

async function insertPositionAdjustmentLot({
  tx,
  userId,
  platformId,
  symbolId,
  row,
  sourceSystem,
}: PositionAdjustmentLotParams) {
  if (!row.positionAdjustment || !row.date || !row.ticker) return;
  const [trade] = await tx.insert(trades).values({
    userId,
    platformId,
    symbolId,
    tradeType: "buy",
    tradeDate: row.date,
    quantity: row.positionAdjustment.quantity.toFixed(8),
    price: row.positionAdjustment.price.toFixed(4),
    fee: "0.0000",
    currencyCode: row.currencyCode ?? "USD",
    notes: `Imported from ${sourceSystem}: non-cash position adjustment before ${row.sourceType}. ${row.positionAdjustment.reason}`,
    sourceSystem,
    sourceRowHash: `${row.rowHash}:position-adjustment`,
    importedAt: new Date(),
  }).returning();
  return trade.id;
}

export async function insertTradeRow({
  tx,
  userId,
  platformId,
  row,
  cashBalance,
  platformCurrency,
  rates,
  sourceSystem,
}: WriteRowParams) {
  if (!row.ticker || !row.tradeType || !row.date || !row.quantity || !row.price) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Row ${row.rowIndex} is missing trade values.` });
  }

  const symbol = await ensureSymbol(tx, userId, row.ticker, row.currencyCode ?? "USD");
  const positionAdjustmentTradeId = row.tradeType === "sell"
    ? await insertPositionAdjustmentLot({
      tx,
      userId,
      platformId,
      row,
      sourceSystem,
      symbolId: symbol.id,
    })
    : undefined;

  const fee = row.fee ?? 0;
  const [trade] = await tx.insert(trades).values({
    userId,
    platformId,
    symbolId: symbol.id,
    tradeType: row.tradeType,
    tradeDate: row.date,
    quantity: row.quantity.toFixed(8),
    price: row.price.toFixed(4),
    fee: fee.toFixed(4),
    currencyCode: row.currencyCode ?? "USD",
    notes: `Imported from ${sourceSystem}: ${row.sourceType}`,
    sourceSystem,
    sourceRowHash: row.rowHash,
    importedAt: new Date(),
  }).returning();

  const quantity = Number(row.quantity);
  const price = Number(row.price);
  const fallbackImpact = row.tradeType === "buy" ? -(quantity * price + fee) : quantity * price - fee;
  const cashImpact = convertImportCashImpact({
    amount: row.cashImpact ?? fallbackImpact,
    fromCurrency: row.currencyCode ?? platformCurrency,
    toCurrency: platformCurrency,
    fxRate: row.fxRate,
    rates,
  });
  const newBalance = cashBalance + cashImpact;

  await tx.update(platforms)
    .set({ cashBalance: newBalance.toFixed(2) })
    .where(and(eq(platforms.id, platformId), eq(platforms.userId, userId)));

  if (row.tradeType === "sell") {
    const { remaining } = await applyFifoMatch(tx, {
      userId,
      sellTradeId: trade.id,
      platformId,
      symbolId: symbol.id,
      quantity,
      sellPrice: price,
      sellFee: fee,
    });
    if (remaining > ZERO_EPSILON) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Row ${row.rowIndex} has insufficient open quantity. Short by ${remaining.toFixed(8)}.`,
      });
    }
  }

  return { id: trade.id, cashBalance: newBalance, positionAdjustmentTradeId };
}

export async function insertCashEventRow({
  tx,
  userId,
  platformId,
  row,
  cashBalance,
  platformCurrency,
  rates,
  sourceSystem,
}: WriteRowParams) {
  if (!row.eventType || !row.date || row.amount == null) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Row ${row.rowIndex} is missing cash-event values.` });
  }

  const symbol = row.ticker
    ? await ensureSymbol(tx, userId, row.ticker, row.currencyCode ?? "USD")
    : null;
  const [event] = await tx.insert(cashEvents).values({
    userId,
    platformId,
    symbolId: symbol?.id,
    eventType: row.eventType,
    eventDate: row.date,
    amount: row.amount.toFixed(4),
    currencyCode: row.currencyCode ?? "USD",
    fxRate: row.fxRate == null ? null : row.fxRate.toFixed(8),
    sourceSystem,
    sourceRowHash: row.rowHash,
    notes: `Imported from ${sourceSystem}: ${row.sourceType}`,
  }).returning();

  const cashImpact = convertImportCashImpact({
    amount: row.cashImpact ?? row.amount,
    fromCurrency: row.currencyCode ?? platformCurrency,
    toCurrency: platformCurrency,
    fxRate: row.fxRate,
    rates,
  });
  const newBalance = cashBalance + cashImpact;
  await tx.update(platforms)
    .set({ cashBalance: newBalance.toFixed(2) })
    .where(and(eq(platforms.id, platformId), eq(platforms.userId, userId)));

  return { id: event.id, cashBalance: newBalance };
}
