import { pgTable, text, timestamp, boolean, decimal, index, unique, date } from "drizzle-orm/pg-core";
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
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    unique("symbols_user_id_ticker_unique").on(table.userId, table.ticker),
  ]
);

export const buckets = pgTable(
  "buckets",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    budgetAmount: decimal("budget_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    sortOrder: decimal("sort_order").notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    unique("buckets_user_id_key_unique").on(table.userId, table.key),
  ]
);

export const trades = pgTable(
  "trades",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    platformId: text("platform_id").notNull().references(() => platforms.id, { onDelete: "restrict" }),
    symbolId: text("symbol_id").notNull().references(() => symbols.id, { onDelete: "restrict" }),
    bucketId: text("bucket_id").references(() => buckets.id, { onDelete: "set null" }),
    tradeType: text("trade_type", { enum: ["buy", "sell"] }).notNull(),
    tradeDate: date("trade_date").notNull(),
    quantity: decimal("quantity", { precision: 16, scale: 4 }).notNull(),
    price: decimal("price", { precision: 16, scale: 4 }).notNull(),
    fee: decimal("fee", { precision: 12, scale: 4 }).notNull().default("0"),
    currencyCode: text("currency_code").notNull().default("USD"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    index("trades_user_id_trade_date_idx").on(table.userId, table.tradeDate),
    index("trades_user_plat_sym_buck_date_idx").on(table.userId, table.platformId, table.symbolId, table.bucketId, table.tradeDate),
  ]
);

export const tradeLotMatches = pgTable(
  "trade_lot_matches",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    sellTradeId: text("sell_trade_id").notNull().references(() => trades.id, { onDelete: "cascade" }),
    buyTradeId: text("buy_trade_id").notNull().references(() => trades.id, { onDelete: "cascade" }),
    matchedQuantity: decimal("matched_quantity", { precision: 16, scale: 4 }).notNull(),
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
    manualContributionAmount: decimal("manual_contribution_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    unique("capital_progress_settings_user_id_unique").on(table.userId),
  ]
);

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    platformId: text("platform_id").references(() => platforms.id, { onDelete: "set null" }),
    symbolId: text("symbol_id").notNull().references(() => symbols.id, { onDelete: "cascade" }),
    thesis: text("thesis"),
    targetBuyPrice: decimal("target_buy_price", { precision: 16, scale: 4 }),
    targetSellPrice: decimal("target_sell_price", { precision: 16, scale: 4 }),
    status: text("status", { enum: ["watching", "ready", "bought", "archived"] }).notNull().default("watching"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  }
);

export const watchlistTags = pgTable(
  "watchlist_tags",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("watchlist_tags_user_id_name_unique").on(table.userId, table.name),
  ]
);

export const watchlistItemTags = pgTable(
  "watchlist_item_tags",
  {
    watchlistItemId: text("watchlist_item_id").notNull().references(() => watchlistItems.id, { onDelete: "cascade" }),
    watchlistTagId: text("watchlist_tag_id").notNull().references(() => watchlistTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("watchlist_item_tags_item_tag_unique").on(table.watchlistItemId, table.watchlistTagId),
  ]
);

export const shadowCases = pgTable(
  "shadow_cases",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    platformId: text("platform_id").references(() => platforms.id, { onDelete: "set null" }),
    bucket: text("bucket"),
    symbol: text("symbol").notNull(),
    direction: text("direction", { enum: ["up", "down", "watch"] }).notNull(),
    thesis: text("thesis").notNull(),
    confidence: text("confidence"),
    timeHorizon: text("time_horizon"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    entryPrice: decimal("entry_price", { precision: 16, scale: 4 }).notNull(),
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
  bucket: one(buckets, { fields: [trades.bucketId], references: [buckets.id] }),
}));

export const tradeLotMatchesRelations = relations(tradeLotMatches, ({ one }) => ({
  sellTrade: one(trades, { fields: [tradeLotMatches.sellTradeId], references: [trades.id] }),
  buyTrade: one(trades, { fields: [tradeLotMatches.buyTradeId], references: [trades.id] })
}));
