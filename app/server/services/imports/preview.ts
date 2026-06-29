import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { cashEvents, importBatches, platforms, symbols, trades } from "@/db/schema";
import { sha256 } from "./hash";
import { classifyImportRow } from "./match";
import { parseRevolutCsv } from "./adapters/revolut";
import { parseManualCsv } from "./adapters/manual";
import type { ImportPreview, ImportStatus, NormalizedImportRow, SourceSystem } from "./types";

export type PreviewInput = {
  sourceSystem: SourceSystem;
  platformId: string;
  fileName: string;
  fileContent: string;
};

function parseRows(sourceSystem: SourceSystem, fileContent: string): NormalizedImportRow[] {
  if (sourceSystem === "revolut") return parseRevolutCsv(fileContent);
  if (sourceSystem === "manual") return parseManualCsv(fileContent);
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

  const rows = parseRows(input.sourceSystem, input.fileContent);
  const [existingSymbols, existingTrades, existingCashEvents, existingBatches] = await Promise.all([
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
        eq(importBatches.sourceSystem, input.sourceSystem),
        eq(importBatches.status, "imported"),
      ),
      with: { rows: true },
    }),
  ]);

  const symbolTickers = new Set(existingSymbols.map((symbol) => symbol.ticker.toUpperCase()));
  const existingImportRowHashes = new Set(
    existingBatches.flatMap((batch) => batch.rows.filter((row) => row.status === "imported").map((row) => row.rowHash)),
  );
  const previewRows = rows.map((row) =>
    classifyImportRow({
      row,
      sourceSystem: input.sourceSystem,
      trades: existingTrades,
      cashEvents: existingCashEvents,
      symbolExists: row.ticker ? symbolTickers.has(row.ticker) : false,
      existingImportRowHashes,
    }),
  );

  return {
    sourceSystem: input.sourceSystem,
    fileName: input.fileName,
    fileHash: sha256(input.fileContent),
    rows: previewRows,
    summary: summarize(previewRows),
  };
}
