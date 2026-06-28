import { index, pgTable, text, timestamp, date, decimal, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { platforms, symbols } from "./app";

export const cashEvents = pgTable(
  "cash_events",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    platformId: text("platform_id").notNull().references(() => platforms.id, { onDelete: "restrict" }),
    symbolId: text("symbol_id").references(() => symbols.id, { onDelete: "set null" }),
    eventType: text("event_type", {
      enum: ["dividend", "dividend_tax", "fee", "fee_reversal", "deposit", "withdrawal", "transfer", "other"],
    }).notNull(),
    eventDate: date("event_date").notNull(),
    amount: decimal("amount", { precision: 16, scale: 4 }).notNull(),
    currencyCode: text("currency_code").notNull().default("USD"),
    fxRate: decimal("fx_rate", { precision: 18, scale: 8 }),
    sourceSystem: text("source_system"),
    sourceRowHash: text("source_row_hash"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    index("cash_events_user_date_idx").on(table.userId, table.eventDate),
    index("cash_events_user_platform_idx").on(table.userId, table.platformId),
    index("cash_events_user_symbol_idx").on(table.userId, table.symbolId),
    unique("cash_events_user_source_row_unique").on(table.userId, table.sourceSystem, table.sourceRowHash),
  ],
);

export const cashEventsRelations = relations(cashEvents, ({ one }) => ({
  user: one(user, { fields: [cashEvents.userId], references: [user.id] }),
  platform: one(platforms, { fields: [cashEvents.platformId], references: [platforms.id] }),
  symbol: one(symbols, { fields: [cashEvents.symbolId], references: [symbols.id] }),
}));
