import { pgTable, text, timestamp, boolean, decimal, index, unique, date, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

export const platforms = pgTable(
  "platforms",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    currencyCode: text("currency_code").notNull().default("USD"),
    isActive: boolean("is_active").notNull().default(true),
    cashBalance: decimal("cash_balance", { precision: 14, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    unique("platforms_user_id_name_unique").on(table.userId, table.name),
  ]
);

export const symbols = pgTable(
  "symbols",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    displayName: text("display_name"),
    exchange: text("exchange"),
    currencyCode: text("currency_code"),
    sector: text("sector"),
    industry: text("industry"),
    metadataSyncedAt: timestamp("metadata_synced_at", { withTimezone: true }),
    rsiTicker: text("rsi_ticker"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    unique("symbols_user_id_ticker_unique").on(table.userId, table.ticker),
  ]
);

export const trades = pgTable(
  "trades",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    platformId: text("platform_id").notNull().references(() => platforms.id, { onDelete: "restrict" }),
    symbolId: text("symbol_id").notNull().references(() => symbols.id, { onDelete: "restrict" }),
    tradeType: text("trade_type", { enum: ["buy", "sell"] }).notNull(),
    tradeDate: date("trade_date").notNull(),
    executedAt: text("executed_at"),
    executionOrder: integer("execution_order"),
    quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
    price: decimal("price", { precision: 16, scale: 4 }).notNull(),
    fee: decimal("fee", { precision: 12, scale: 4 }).notNull().default("0"),
    currencyCode: text("currency_code").notNull().default("USD"),
    notes: text("notes"),
    sourceSystem: text("source_system"),
    sourceRowHash: text("source_row_hash"),
    importedAt: timestamp("imported_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    index("trades_user_id_trade_date_idx").on(table.userId, table.tradeDate),
    index("trades_user_plat_sym_date_idx").on(table.userId, table.platformId, table.symbolId, table.tradeDate),
    index("trades_user_plat_sym_execution_idx").on(
      table.userId,
      table.platformId,
      table.symbolId,
      table.tradeDate,
      table.executedAt,
      table.executionOrder,
    ),
    unique("trades_user_source_row_unique").on(table.userId, table.sourceSystem, table.sourceRowHash),
  ]
);

export const tradeLotMatches = pgTable(
  "trade_lot_matches",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    sellTradeId: text("sell_trade_id").notNull().references(() => trades.id, { onDelete: "cascade" }),
    buyTradeId: text("buy_trade_id").notNull().references(() => trades.id, { onDelete: "cascade" }),
    matchedQuantity: decimal("matched_quantity", { precision: 18, scale: 8 }).notNull(),
    buyPrice: decimal("buy_price", { precision: 16, scale: 4 }).notNull(),
    sellPrice: decimal("sell_price", { precision: 16, scale: 4 }).notNull(),
    matchedCost: decimal("matched_cost", { precision: 14, scale: 2 }).notNull(),
    matchedProceeds: decimal("matched_proceeds", { precision: 14, scale: 2 }).notNull(),
    realizedPnl: decimal("realized_pnl", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const goals = pgTable(
  "goals",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    goalType: text("goal_type", { enum: ["monthly_profit", "yearly_profit"] }).notNull().default("monthly_profit"),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  }
);

export const capitalProgressSettings = pgTable(
  "capital_progress_settings",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    currencyCode: text("currency_code").notNull().default("EUR"),
    targetAmount: decimal("target_amount", { precision: 14, scale: 2 }).notNull().default("100000"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    unique("capital_progress_settings_user_id_unique").on(table.userId),
  ]
);

export const shadowCases = pgTable(
  "shadow_cases",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    platformId: text("platform_id").references(() => platforms.id, { onDelete: "set null" }),
    symbol: text("symbol").notNull(),
    direction: text("direction", { enum: ["up", "down", "watch"] }).notNull(),
    thesis: text("thesis").notNull(),
    confidence: text("confidence"),
    timeHorizon: text("time_horizon"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    entryPrice: decimal("entry_price", { precision: 16, scale: 4 }).notNull(),
    entryRsi: decimal("entry_rsi", { precision: 6, scale: 2 }),
    status: text("status", { enum: ["open", "review_ready", "closed", "archived"] }).notNull().default("open"),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    exitPrice: decimal("exit_price", { precision: 16, scale: 4 }),
    priceChangeAbs: decimal("price_change_abs", { precision: 16, scale: 4 }),
    priceChangePct: decimal("price_change_pct", { precision: 8, scale: 4 }),
    outcome: text("outcome", { enum: ["correct", "wrong", "mixed", "invalidated", "unreviewed"] }),
    resultSummary: text("result_summary"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    index("shadow_cases_user_id_idx").on(table.userId),
    index("shadow_cases_user_status_idx").on(table.userId, table.status),
  ]
);

export const shadowNotes = pgTable(
  "shadow_notes",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    shadowCaseId: text("shadow_case_id").notNull().references(() => shadowCases.id, { onDelete: "cascade" }),
    noteType: text("note_type", { enum: ["thesis_note", "observation_note", "catalyst_note", "review_note", "lesson_note"] }).notNull().default("observation_note"),
    title: text("title"),
    body: text("body").notNull(),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    index("shadow_notes_case_id_idx").on(table.shadowCaseId),
  ]
);

export const indicatorSnapshots = pgTable(
  "indicator_snapshots",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    period: integer("period").notNull().default(14),
    rsi: decimal("rsi", { precision: 6, scale: 2 }).notNull(),
    // JSON-encoded array of up to 3 most-recent daily RSI values (oldest → newest).
    // Lets the UI show a trend (e.g. 39 → 37 → 36) without a second fetch.
    history: text("history"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("indicator_snapshots_user_ticker_idx").on(table.userId, table.ticker),
    unique("indicator_snapshots_user_ticker_period_unique").on(table.userId, table.ticker, table.period),
  ]
);

export const shadowCasesRelations = relations(shadowCases, ({ one, many }) => ({
  user: one(user, { fields: [shadowCases.userId], references: [user.id] }),
  platform: one(platforms, { fields: [shadowCases.platformId], references: [platforms.id] }),
  notes: many(shadowNotes),
}));

export const shadowNotesRelations = relations(shadowNotes, ({ one }) => ({
  shadowCase: one(shadowCases, { fields: [shadowNotes.shadowCaseId], references: [shadowCases.id] }),
}));

export const tradesRelations = relations(trades, ({ one }) => ({
  user: one(user, { fields: [trades.userId], references: [user.id] }),
  platform: one(platforms, { fields: [trades.platformId], references: [platforms.id] }),
  symbol: one(symbols, { fields: [trades.symbolId], references: [symbols.id] }),
}));

export const tradeLotMatchesRelations = relations(tradeLotMatches, ({ one }) => ({
  sellTrade: one(trades, { fields: [tradeLotMatches.sellTradeId], references: [trades.id] }),
  buyTrade: one(trades, { fields: [tradeLotMatches.buyTradeId], references: [trades.id] })
}));

export const tickerCatalog = pgTable(
  "ticker_catalog",
  {
    symbol: text("symbol").primaryKey(),
    name: text("name"),
    exchange: text("exchange"),
    marketCategory: text("market_category"),
    isEtf: boolean("is_etf").notNull().default(false),
    isTest: boolean("is_test").notNull().default(false),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ticker_catalog_symbol_idx").on(table.symbol),
    index("ticker_catalog_exchange_idx").on(table.exchange),
  ]
);
