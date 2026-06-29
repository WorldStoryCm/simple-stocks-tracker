import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { cashEvents, importBatches, importRows, platforms, trades } from "@/db/schema";
import { getExchangeRates } from "@/lib/exchange-rates";
import { buildPreview, type PreviewInput } from "./preview";
import type { ImportCommitResult, PreviewImportRow } from "./types";
import { applyCorporateActionRow, applyMergerStockRows } from "./corporateActions";
import { expandSelectedRowsWithRequiredCorporateActions } from "./selection";
import { insertCashEventRow, insertTradeRow } from "./writeRows";

type CommitInput = PreviewInput & {
  selectedRowHashes?: string[];
  replaceHistory?: boolean;
};

function byBrokerDate(left: PreviewImportRow, right: PreviewImportRow) {
  const dateCompare = (left.date ?? "").localeCompare(right.date ?? "");
  return dateCompare || left.rowIndex - right.rowIndex;
}

function canCommit(row: PreviewImportRow, selected: Set<string>, replaceHistory: boolean) {
  if (!selected.has(row.rowHash) || !row.importable) return false;
  if (row.kind !== "trade" && row.kind !== "cash_event" && row.kind !== "corporate_action") return false;
  if (replaceHistory) return row.status === "new" || row.status === "possible_match" || row.status === "matched";
  return row.status === "new" || row.status === "possible_match";
}

function mergerKey(row: PreviewImportRow) {
  return row.date || row.raw.Date || "";
}

export async function commitImport(userId: string, input: CommitInput): Promise<ImportCommitResult> {
  const preview = await buildPreview(userId, input);
  const rates = await getExchangeRates();
  const replaceHistory = input.replaceHistory === true;
  const defaultRows = preview.rows.filter((row) =>
    replaceHistory
      ? row.importable && (row.kind === "trade" || row.kind === "cash_event" || row.kind === "corporate_action")
      : row.status === "new",
  );
  const selected = expandSelectedRowsWithRequiredCorporateActions(
    preview.rows,
    replaceHistory ? defaultRows.map((row) => row.rowHash) : input.selectedRowHashes ?? defaultRows.map((row) => row.rowHash),
  );
  const rowsToCommit = preview.rows
    .filter((row) => canCommit(row, selected, replaceHistory))
    .sort(byBrokerDate);
  if (replaceHistory && rowsToCommit.length === 0) {
    const blocked = preview.rows.find((row) => row.status === "needs_review" || row.kind === "unsupported");
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: blocked
        ? `Replace found no importable rows. First blocked row ${blocked.rowIndex}: ${blocked.message ?? blocked.sourceType}`
        : "Replace found no importable rows in this file.",
    });
  }

  let batchId = "";
  let imported = 0;
  const committedByIndex = new Map<number, { tradeId?: string; cashEventId?: string; normalizedJson?: string }>();
  const committedHashes = new Set<string>();
  const committedMergerKeys = new Set<string>();

  await db.transaction(async (tx) => {
    const platform = await tx.query.platforms.findFirst({
      where: and(eq(platforms.id, input.platformId), eq(platforms.userId, userId)),
    });
    if (!platform) throw new TRPCError({ code: "NOT_FOUND", message: "Platform not found" });

    let cashBalance = Number(platform.cashBalance);
    const platformCurrency = platform.currencyCode;
    const cashBalanceBefore = cashBalance;

    if (replaceHistory) {
      await tx.delete(importBatches).where(and(eq(importBatches.userId, userId), eq(importBatches.platformId, input.platformId)));
      await tx.delete(cashEvents).where(and(eq(cashEvents.userId, userId), eq(cashEvents.platformId, input.platformId)));
      await tx.delete(trades).where(and(eq(trades.userId, userId), eq(trades.platformId, input.platformId)));
      cashBalance = 0;
      await tx.update(platforms)
        .set({ cashBalance: "0.00" })
        .where(and(eq(platforms.id, input.platformId), eq(platforms.userId, userId)));
    }

    const [batch] = await tx.insert(importBatches).values({
      userId,
      platformId: input.platformId,
      sourceSystem: preview.sourceSystem,
      fileName: input.fileName,
      fileHash: preview.fileHash,
      rowCount: preview.rows.length,
      status: "imported",
      summaryJson: JSON.stringify({ preview: preview.summary }),
    }).returning();
    batchId = batch.id;

    for (const row of rowsToCommit) {
      if (committedHashes.has(row.rowHash)) continue;
      let rowCommitted = false;
      if (row.kind === "trade") {
        const result = await insertTradeRow({
          tx,
          userId,
          platformId: input.platformId,
          row,
          cashBalance,
          platformCurrency,
          rates,
          sourceSystem: preview.sourceSystem,
        });
        cashBalance = result.cashBalance;
        committedByIndex.set(row.rowIndex, {
          tradeId: result.id,
          normalizedJson: result.positionAdjustmentTradeId
            ? JSON.stringify({ ...row, appliedPositionAdjustment: { tradeId: result.positionAdjustmentTradeId } })
            : undefined,
        });
        rowCommitted = true;
      } else if (row.kind === "cash_event") {
        const result = await insertCashEventRow({
          tx,
          userId,
          platformId: input.platformId,
          row,
          cashBalance,
          platformCurrency,
          rates,
          sourceSystem: preview.sourceSystem,
        });
        cashBalance = result.cashBalance;
        committedByIndex.set(row.rowIndex, { cashEventId: result.id });
        rowCommitted = true;
      } else if (row.kind === "corporate_action") {
        if (row.corporateActionType === "merger_stock") {
          const key = mergerKey(row);
          if (committedMergerKeys.has(key)) continue;
          const mergerRows = rowsToCommit.filter((candidate) =>
            candidate.kind === "corporate_action"
            && candidate.corporateActionType === "merger_stock"
            && mergerKey(candidate) === key,
          );
          const result = await applyMergerStockRows({
            tx,
            userId,
            platformId: input.platformId,
            sourceSystem: preview.sourceSystem,
            rows: mergerRows,
          });
          for (const mergerRow of mergerRows) {
            const createdTrade = result.createdTrades.find((trade) => trade.rowHash === mergerRow.rowHash);
            const normalizedResult = (mergerRow.quantity ?? 0) < 0
              ? { transferredCost: result.transferredCost, adjustments: result.adjustments }
              : { transferredCost: result.transferredCost, unitCost: result.unitCost, createdTrades: result.createdTrades };
            committedByIndex.set(mergerRow.rowIndex, {
              tradeId: createdTrade?.tradeId,
              normalizedJson: JSON.stringify({ ...mergerRow, appliedCorporateAction: normalizedResult }),
            });
            committedHashes.add(mergerRow.rowHash);
            imported++;
          }
          committedMergerKeys.add(key);
          continue;
        }
        const result = await applyCorporateActionRow({
          tx,
          userId,
          platformId: input.platformId,
          row,
        });
        committedByIndex.set(row.rowIndex, {
          normalizedJson: JSON.stringify({ ...row, appliedCorporateAction: result }),
        });
        rowCommitted = true;
      }
      if (rowCommitted) {
        committedHashes.add(row.rowHash);
        imported++;
      }
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
          normalizedJson: committed?.normalizedJson ?? JSON.stringify(row),
          matchedTradeId,
          matchedCashEventId,
          message: row.message ?? row.matched?.reason,
        };
      }));
    }

    await tx.update(importBatches)
      .set({
        importedCount: imported,
        skippedCount: preview.rows.length - imported,
        summaryJson: JSON.stringify({
          preview: preview.summary,
          replaceHistory,
          cashBalanceBefore,
          cashBalanceAfter: cashBalance,
          cashBalanceDelta: cashBalance - cashBalanceBefore,
        }),
      })
      .where(eq(importBatches.id, batchId));
  });

  return { batchId, imported, skipped: preview.rows.length - imported, errors: [] };
}
