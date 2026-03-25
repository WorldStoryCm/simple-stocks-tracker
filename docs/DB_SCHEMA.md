# Stock Tracking App — Database Schema Draft

## 1. users
Handled by Better Auth.

App tables should reference the authenticated user id.

---

## 2. platforms
Purpose: user-managed broker/account list.

Fields:
- id
- user_id
- name
- currency_code
- is_active
- notes
- created_at
- updated_at

Constraints:
- unique `(user_id, name)`

---

## 3. symbols
Purpose: stock/symbol registry per user or shared app-level table.

Recommended v1: user-scoped symbols for simplicity.

Fields:
- id
- user_id
- ticker
- display_name nullable
- exchange nullable
- currency_code nullable
- notes nullable
- created_at
- updated_at

Constraints:
- unique `(user_id, ticker)`

---

## 4. buckets
Purpose: capital horizon buckets.

Seed defaults:
- short_term
- mid_term
- long_term

Fields:
- id
- user_id
- key
- label
- budget_amount
- sort_order
- is_active
- created_at
- updated_at

Constraints:
- unique `(user_id, key)`

---

## 5. trades
Purpose: raw ledger of buy and sell transactions.

Fields:
- id
- user_id
- platform_id
- symbol_id
- bucket_id
- trade_type (`buy` | `sell`)
- trade_date
- quantity decimal
- price decimal
- fee decimal default 0
- currency_code
- notes nullable
- created_at
- updated_at

Indexes:
- `(user_id, trade_date desc)`
- `(user_id, platform_id, symbol_id, bucket_id, trade_date)`

---

## 6. trade_lot_matches
Purpose: store FIFO matches between sell trades and buy trades for auditability.

Fields:
- id
- user_id
- sell_trade_id
- buy_trade_id
- matched_quantity decimal
- buy_price decimal
- sell_price decimal
- matched_cost decimal
- matched_proceeds decimal
- realized_pnl decimal
- created_at

Why this table matters:
- makes realized P/L explainable
- supports edit/delete recalculation
- allows users to inspect which buys were matched to a sell

---

## 7. position_snapshots (optional but recommended)
Purpose: cache current position aggregates for fast reads.

Fields:
- id
- user_id
- platform_id
- symbol_id
- bucket_id
- open_quantity decimal
- avg_open_cost decimal
- invested_amount decimal
- realized_pnl decimal
- updated_at

Note:
This table is derived data and can be rebuilt from trades + lot matches.

---

## 8. price_snapshots (optional v1.1)
Purpose: manual current price entries for unrealized P/L.

Fields:
- id
- user_id
- symbol_id
- price_date
- price decimal
- source (`manual`)
- created_at

---

## 9. goals
Purpose: user-defined performance goals.

Fields:
- id
- user_id
- goal_type (`weekly_profit`)
- amount decimal
- is_active
- starts_at nullable
- ends_at nullable
- created_at
- updated_at

---

## 10. watchlist_items
Purpose: track watched symbols.

Fields:
- id
- user_id
- platform_id nullable
- symbol_id
- thesis nullable
- target_buy_price nullable
- target_sell_price nullable
- status (`watching` | `ready` | `bought` | `archived`)
- notes nullable
- created_at
- updated_at

---

## 11. watchlist_tags
Fields:
- id
- user_id
- name
- created_at

Constraints:
- unique `(user_id, name)`

---

## 12. watchlist_item_tags
Fields:
- watchlist_item_id
- watchlist_tag_id

Constraints:
- unique `(watchlist_item_id, watchlist_tag_id)`

---

## 13. Suggested deletion strategy
Use soft deletes only where necessary.

Recommended:
- platforms: archive instead of hard delete if referenced by trades
- symbols: avoid deletion if referenced
- trades: allow deletion, but force full recalculation of dependent matches/snapshots
