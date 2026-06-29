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
