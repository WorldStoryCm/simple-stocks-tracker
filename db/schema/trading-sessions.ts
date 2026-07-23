import { relations } from "drizzle-orm";
import { decimal, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { platforms, symbols, trades } from "./app";

export const tradingSessions = pgTable(
  "trading_sessions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    platformId: text("platform_id").notNull().references(() => platforms.id, { onDelete: "restrict" }),
    symbolId: text("symbol_id").notNull().references(() => symbols.id, { onDelete: "restrict" }),
    status: text("status", { enum: ["active", "closed"] }).notNull().default("active"),
    openingSource: text("opening_source", { enum: ["position", "manual"] }).notNull(),
    openingQuantity: decimal("opening_quantity", { precision: 18, scale: 8 }).notNull(),
    openingTotalCost: decimal("opening_total_cost", { precision: 18, scale: 4 }).notNull(),
    openingMarketPrice: decimal("opening_market_price", { precision: 16, scale: 4 }).notNull(),
    manualMarkPrice: decimal("manual_mark_price", { precision: 16, scale: 4 }),
    currencyCode: text("currency_code").notNull().default("USD"),
    usdPerEur: decimal("usd_per_eur", { precision: 18, scale: 8 }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    index("trading_sessions_user_status_idx").on(table.userId, table.status),
    index("trading_sessions_user_symbol_idx").on(table.userId, table.symbolId),
  ],
);

export const tradingSessionOpeningLots = pgTable(
  "trading_session_opening_lots",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id").notNull().references(() => tradingSessions.id, { onDelete: "cascade" }),
    sourceTradeId: text("source_trade_id").references(() => trades.id, { onDelete: "set null" }),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }),
    quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
    unitPrice: decimal("unit_price", { precision: 16, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("trading_session_opening_lots_session_idx").on(table.sessionId)],
);

export const tradingSessionEvents = pgTable(
  "trading_session_events",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id").notNull().references(() => tradingSessions.id, { onDelete: "cascade" }),
    eventType: text("event_type", { enum: ["buy", "sell"] }).notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
    quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
    price: decimal("price", { precision: 16, scale: 4 }).notNull(),
    fee: decimal("fee", { precision: 12, scale: 4 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("trading_session_events_session_time_idx").on(table.sessionId, table.executedAt)],
);

export const tradingSessionsRelations = relations(tradingSessions, ({ one, many }) => ({
  user: one(user, { fields: [tradingSessions.userId], references: [user.id] }),
  platform: one(platforms, { fields: [tradingSessions.platformId], references: [platforms.id] }),
  symbol: one(symbols, { fields: [tradingSessions.symbolId], references: [symbols.id] }),
  openingLots: many(tradingSessionOpeningLots),
  events: many(tradingSessionEvents),
}));

export const tradingSessionOpeningLotsRelations = relations(tradingSessionOpeningLots, ({ one }) => ({
  session: one(tradingSessions, {
    fields: [tradingSessionOpeningLots.sessionId],
    references: [tradingSessions.id],
  }),
  sourceTrade: one(trades, {
    fields: [tradingSessionOpeningLots.sourceTradeId],
    references: [trades.id],
  }),
}));

export const tradingSessionEventsRelations = relations(tradingSessionEvents, ({ one }) => ({
  session: one(tradingSessions, {
    fields: [tradingSessionEvents.sessionId],
    references: [tradingSessions.id],
  }),
}));
