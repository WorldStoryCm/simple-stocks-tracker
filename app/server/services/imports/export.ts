import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { cashEvents, platforms, trades } from "@/db/schema";
import { stringifyCsv } from "./csv";

function tradeAmount(trade: { tradeType: "buy" | "sell"; quantity: string | number; price: string | number; fee: string | number }) {
  const gross = Number(trade.quantity) * Number(trade.price);
  const fee = Number(trade.fee ?? 0);
  return trade.tradeType === "buy" ? -(gross + fee) : gross - fee;
}

function sanitizeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "platform";
}

export async function exportLedger(userId: string, platformId: string) {
  const platform = await db.query.platforms.findFirst({
    where: and(eq(platforms.id, platformId), eq(platforms.userId, userId)),
  });
  if (!platform) throw new TRPCError({ code: "NOT_FOUND", message: "Platform not found" });

  const [platformTrades, platformCashEvents] = await Promise.all([
    db.query.trades.findMany({
      where: and(eq(trades.userId, userId), eq(trades.platformId, platformId)),
      orderBy: [asc(trades.tradeDate), asc(trades.createdAt)],
      with: { symbol: true },
    }),
    db.query.cashEvents.findMany({
      where: and(eq(cashEvents.userId, userId), eq(cashEvents.platformId, platformId)),
      orderBy: [asc(cashEvents.eventDate), asc(cashEvents.createdAt)],
      with: { symbol: true },
    }),
  ]);

  const rows = [
    ["Kind", "Date", "Type", "Ticker", "Quantity", "Price", "Amount", "Currency", "Fee", "FX Rate", "Notes"],
    ...platformTrades.map((trade) => [
      "trade",
      trade.tradeDate,
      trade.tradeType,
      trade.symbol?.ticker ?? "",
      trade.quantity,
      trade.price,
      tradeAmount(trade).toFixed(4),
      trade.currencyCode,
      trade.fee,
      "",
      trade.notes ?? "",
    ]),
    ...platformCashEvents.map((event) => [
      "cash_event",
      event.eventDate,
      event.eventType,
      event.symbol?.ticker ?? "",
      "",
      "",
      event.amount,
      event.currencyCode,
      "",
      event.fxRate ?? "",
      event.notes ?? "",
    ]),
  ];

  const [, ...dataRows] = rows;
  dataRows.sort((left, right) => String(left[1]).localeCompare(String(right[1])));

  const date = new Date().toISOString().slice(0, 10);
  return {
    fileName: `stock-tracker-${sanitizeFilePart(platform.name)}-backup-${date}.csv`,
    fileContent: stringifyCsv([rows[0], ...dataRows]),
    rowCount: dataRows.length,
  };
}
