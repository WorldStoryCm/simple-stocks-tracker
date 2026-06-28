import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { cashEvents, importBatches, importRows, platforms, symbols, trades } from "@/db/schema";
import { applyFifoMatch } from "../trades/fifo";
import { buildPreview, type PreviewInput } from "./preview";
import type { ImportCommitResult, PreviewImportRow } from "./types";

type CommitInput = PreviewInput & {
  selectedRowHashes?: string[];
};

const ZERO_EPSILON = 0.000001;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function byBrokerDate(left: PreviewImportRow, right: PreviewImportRow) {
  const dateCompare = (left.date ?? "").localeCompare(right.date ?? "");
  return dateCompare || left.rowIndex - right.rowIndex;
}

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

async function insertTradeRow({
  tx,
  userId,
  platformId,
  row,
  cashBalance,
  sourceSystem,
}: {
  tx: Tx;
  userId: string;
  platformId: string;
  row: PreviewImportRow;
  cashBalance: number;
  sourceSystem: string;
}) {
  if (!row.ticker || !row.tradeType || !row.date || !row.quantity || !row.price) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Row ${row.rowIndex} is missing trade values.` });
  }

  const symbol = await ensureSymbol(tx, userId, row.ticker, row.currencyCode ?? "USD");
  const [trade] = await tx.insert(trades).values({
    userId,
    platformId,
    symbolId: symbol.id,
    tradeType: row.tradeType,
    tradeDate: row.date,
    quantity: row.quantity.toFixed(8),
    price: row.price.toFixed(4),
    fee: "0",
    currencyCode: row.currencyCode ?? "USD",
    notes: `Imported from ${sourceSystem}: ${row.sourceType}`,
    sourceSystem,
    sourceRowHash: row.rowHash,
    importedAt: new Date(),
  }).returning();

  const quantity = Number(row.quantity);
  const price = Number(row.price);
  const newBalance = row.tradeType === "buy"
    ? Math.max(0, cashBalance - quantity * price)
    : cashBalance + quantity * price;

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
      sellFee: 0,
    });
    if (remaining > ZERO_EPSILON) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Row ${row.rowIndex} has insufficient open quantity. Short by ${remaining.toFixed(8)}.`,
      });
    }
  }

  return { id: trade.id, cashBalance: newBalance };
}

async function insertCashEventRow({
  tx,
  userId,
  platformId,
  row,
  sourceSystem,
}: {
  tx: Tx;
  userId: string;
  platformId: string;
  row: PreviewImportRow;
  sourceSystem: string;
}) {
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
  return event.id;
}

export async function commitImport(userId: string, input: CommitInput): Promise<ImportCommitResult> {
  const preview = await buildPreview(userId, input);
  const selected = new Set(input.selectedRowHashes ?? preview.rows.filter((row) => row.status === "new").map((row) => row.rowHash));
  const rowsToCommit = preview.rows
    .filter((row) => row.status === "new" && selected.has(row.rowHash))
    .sort(byBrokerDate);

  let batchId = "";
  let imported = 0;
  const committedByIndex = new Map<number, { tradeId?: string; cashEventId?: string }>();
  const committedHashes = new Set<string>();

  await db.transaction(async (tx) => {
    const platform = await tx.query.platforms.findFirst({
      where: and(eq(platforms.id, input.platformId), eq(platforms.userId, userId)),
    });
    if (!platform) throw new TRPCError({ code: "NOT_FOUND", message: "Platform not found" });

    const [batch] = await tx.insert(importBatches).values({
      userId,
      platformId: input.platformId,
      sourceSystem: input.sourceSystem,
      fileName: input.fileName,
      fileHash: preview.fileHash,
      rowCount: preview.rows.length,
      status: "imported",
      summaryJson: JSON.stringify(preview.summary),
    }).returning();
    batchId = batch.id;

    let cashBalance = Number(platform.cashBalance);
    for (const row of rowsToCommit) {
      if (committedHashes.has(row.rowHash)) continue;
      if (row.kind === "trade") {
        const result = await insertTradeRow({
          tx,
          userId,
          platformId: input.platformId,
          row,
          cashBalance,
          sourceSystem: input.sourceSystem,
        });
        cashBalance = result.cashBalance;
        committedByIndex.set(row.rowIndex, { tradeId: result.id });
      } else if (row.kind === "cash_event" && ["dividend", "dividend_tax"].includes(row.eventType ?? "")) {
        const eventId = await insertCashEventRow({ tx, userId, platformId: input.platformId, row, sourceSystem: input.sourceSystem });
        committedByIndex.set(row.rowIndex, { cashEventId: eventId });
      }
      committedHashes.add(row.rowHash);
      imported++;
    }

    if (preview.rows.length > 0) {
      await tx.insert(importRows).values(preview.rows.map((row) => {
        const committed = committedByIndex.get(row.rowIndex);
        const matchedTradeId = committed?.tradeId ?? (row.matched?.kind === "trade" ? row.matched.id : null);
        const matchedCashEventId = committed?.cashEventId ?? (row.matched?.kind === "cash_event" ? row.matched.id : null);
        return {
          batchId,
          rowIndex: row.rowIndex,
          rowHash: row.rowHash,
          kind: row.kind,
          status: committed ? "imported" : row.status,
          confidence: row.confidence.toFixed(4),
          rawJson: JSON.stringify(row.raw),
          normalizedJson: JSON.stringify(row),
          matchedTradeId,
          matchedCashEventId,
          message: row.message ?? row.matched?.reason,
        };
      }));
    }

    await tx.update(importBatches)
      .set({ importedCount: imported, skippedCount: preview.rows.length - imported })
      .where(eq(importBatches.id, batchId));
  });

  return { batchId, imported, skipped: preview.rows.length - imported, errors: [] };
}
