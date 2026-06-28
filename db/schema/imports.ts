import { decimal, index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { platforms, trades } from "./app";
import { cashEvents } from "./cash-events";

export const importBatches = pgTable(
  "import_batches",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    platformId: text("platform_id").notNull().references(() => platforms.id, { onDelete: "restrict" }),
    sourceSystem: text("source_system", { enum: ["revolut", "ibkr", "n26"] }).notNull(),
    fileName: text("file_name").notNull(),
    fileHash: text("file_hash").notNull(),
    rowCount: integer("row_count").notNull().default(0),
    importedCount: integer("imported_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    status: text("status", { enum: ["previewed", "imported", "failed"] }).notNull().default("imported"),
    summaryJson: text("summary_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("import_batches_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const importRows = pgTable(
  "import_rows",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
    rowIndex: integer("row_index").notNull(),
    rowHash: text("row_hash").notNull(),
    kind: text("kind", { enum: ["trade", "cash_event", "corporate_action", "ignored", "unsupported"] }).notNull(),
    status: text("status", {
      enum: ["new", "matched", "possible_match", "needs_review", "ignored", "imported", "error"],
    }).notNull(),
    confidence: decimal("confidence", { precision: 5, scale: 4 }),
    rawJson: text("raw_json").notNull(),
    normalizedJson: text("normalized_json"),
    matchedTradeId: text("matched_trade_id").references(() => trades.id, { onDelete: "set null" }),
    matchedCashEventId: text("matched_cash_event_id").references(() => cashEvents.id, { onDelete: "set null" }),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("import_rows_batch_row_unique").on(table.batchId, table.rowIndex),
    index("import_rows_batch_status_idx").on(table.batchId, table.status),
    index("import_rows_hash_idx").on(table.rowHash),
  ],
);

export const importBatchesRelations = relations(importBatches, ({ one, many }) => ({
  user: one(user, { fields: [importBatches.userId], references: [user.id] }),
  platform: one(platforms, { fields: [importBatches.platformId], references: [platforms.id] }),
  rows: many(importRows),
}));

export const importRowsRelations = relations(importRows, ({ one }) => ({
  batch: one(importBatches, { fields: [importRows.batchId], references: [importBatches.id] }),
  matchedTrade: one(trades, { fields: [importRows.matchedTradeId], references: [trades.id] }),
  matchedCashEvent: one(cashEvents, { fields: [importRows.matchedCashEventId], references: [cashEvents.id] }),
}));
