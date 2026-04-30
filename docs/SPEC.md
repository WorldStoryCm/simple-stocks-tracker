# Stock Tracker — Master Product Specification

## 1. Goal

A personal manual stock journal and performance tracker for people who actively buy and sell across multiple platforms and want clear profit/loss visibility without broker sync complexity.

---

## 2. Product Scope

### In scope
- Authentication with social login
- Single-user personal portfolio tracking
- CRUD for platforms, stocks, trades
- FIFO realized P/L tracking
- Unrealized P/L via manual price entry or snapshots
- Dashboard with cumulative stats by day/week/month
- Weekly profit goal tracking
- Watchlist
- RSI indicator integration across Symbols, Positions, and Shadow Trading
- Shadow Trading — simulated idea tracker and review journal
- Shadow Theses — higher-level narrative containers for shadow cases
- Catalyst Calendar — event and review reminder calendar for Shadow Trading

### Out of scope
- Automatic broker sync
- Direct live market data integration (RSI is manually synced)
- Tax reporting by country
- Dividends, options, forex, crypto
- Multi-user collaboration
- Advanced charting
- CSV or broker statement import
- Margin/short borrowing mechanics

---

## 3. Technical Stack

**Frontend:** Next.js (app router), React, TypeScript, Tailwind, shadcn/ui, TanStack Table, Recharts

**Backend:** Next.js server actions or tRPC/API routes, Better Auth, Drizzle ORM, PostgreSQL, Zod, date-fns

---

## 4. Authentication

Use **Better Auth** with social login (Google; Apple optional).

- All data isolated by `userId`
- One portfolio per user in v1

---

## 5. Core Concepts

| Concept | Description |
|---|---|
| Platform | A broker/account source (e.g. Revolut, N26) |
| Symbol | A tradable ticker being tracked |
| Bucket | Investment horizon: `short_term`, `mid_term`, `long_term` |
| Trade | A buy or sell record in the raw ledger |
| Position | Current open holding scoped by user + platform + symbol + bucket |
| Realized P/L | Profit/loss from FIFO-matched closed lots |
| Unrealized P/L | Open cost basis vs. current manual price |

---

## 6. P/L Logic

### Accounting method
**FIFO** in v1 — deterministic for partial sells, easy to explain in UI.

### Realized P/L
```
realized_pnl = sell_proceeds - matched_buy_cost - fees
sell_proceeds = sell_qty * sell_price
matched_buy_cost = sum of FIFO-matched buy lots
```

### Unrealized P/L
```
unrealized_pnl = market_value - open_cost_basis
market_value = open_qty * current_price (manual entry or latest snapshot)
```

### Position metrics (per open position)
total bought qty · total sold qty · open qty · avg open cost · invested amount · realized P/L · unrealized P/L · total P/L

---

## 7. Data Rules

- Sell quantity cannot exceed available open quantity for that symbol/platform/bucket
- A trade belongs to exactly one user, platform, symbol, and bucket
- All calculations must be reproducible from raw trades
- Editing or deleting a historical trade triggers recalculation from that date forward for the same user/platform/symbol/bucket scope
- Recalculate only the affected subset, not the full ledger

---

## 8. Database Schema

### users
Managed by Better Auth. All app tables reference `user_id`.

### platforms
```
id, user_id, name, currency_code, is_active, notes, created_at, updated_at
unique (user_id, name)
```

### symbols
```
id, user_id, ticker, display_name?, exchange?, currency_code?, notes?, created_at, updated_at
unique (user_id, ticker)
```

### buckets
```
id, user_id, key, label, budget_amount, sort_order, is_active, created_at, updated_at
unique (user_id, key)
defaults: short_term, mid_term, long_term
```

### trades
```
id, user_id, platform_id, symbol_id, bucket_id, trade_type (buy|sell),
trade_date, quantity, price, fee (default 0), currency_code, notes?,
created_at, updated_at
indexes: (user_id, trade_date desc), (user_id, platform_id, symbol_id, bucket_id, trade_date)
```

### trade_lot_matches
```
id, user_id, sell_trade_id, buy_trade_id, matched_quantity, buy_price, sell_price,
matched_cost, matched_proceeds, realized_pnl, created_at
```
Stores FIFO matches for auditability and incremental recalculation.

### position_snapshots (performance cache)
```
id, user_id, platform_id, symbol_id, bucket_id, open_quantity, avg_open_cost,
invested_amount, realized_pnl, updated_at
```
Derived from trades + lot matches. Fully rebuildable.

### price_snapshots (v1.1)
```
id, user_id, symbol_id, price_date, price, source (manual), created_at
```

### goals
```
id, user_id, goal_type (weekly_profit), amount, is_active, starts_at?, ends_at?, created_at, updated_at
```

### watchlist_items
```
id, user_id, platform_id?, symbol_id, thesis?, target_buy_price?, target_sell_price?,
status (watching|ready|bought|archived), notes?, created_at, updated_at
```

### watchlist_tags / watchlist_item_tags
```
watchlist_tags: id, user_id, name, created_at; unique (user_id, name)
watchlist_item_tags: watchlist_item_id, watchlist_tag_id; unique pair
```

### rsi_snapshots
```
id, user_id, symbol_id, rsi_14, rsi_state (oversold|near_oversold|neutral|near_overbought|overbought),
captured_at, source (manual|sync), created_at
```
Single shared table powering RSI display across Symbols, Positions, and Shadow Trading.

### shadow_cases
```
id, user_id, platform_id?, symbol, bucket?, direction (up|down|watch),
thesis, confidence (1-5), time_horizon, started_at, entry_price,
status (open|review_ready|closed|archived), ended_at?, exit_price?,
price_change_abs?, price_change_pct?,
outcome (correct|wrong|mixed|invalidated|unreviewed),
result_summary?, thesis_id?, archived_at?, created_at, updated_at
```

### shadow_snapshots
```
id, shadow_case_id, snapshot_type (start|end|manual), captured_at, price,
day_change_pct?, market_meta_json?, news_meta_json?, raw_context_json?, created_at
```

### shadow_notes
```
id, shadow_case_id,
note_type (thesis_note|observation_note|catalyst_note|review_note|lesson_note),
title?, body, is_pinned, created_at, updated_at
```

### shadow_tags / shadow_case_tags
```
shadow_tags: id, user_id, name, color?, created_at
shadow_case_tags: shadow_case_id, shadow_tag_id
```

### shadow_events (audit trail)
```
id, shadow_case_id, event_type, payload_json, created_at
event_types: case_created, thesis_updated, note_added, case_reviewed, case_closed, outcome_changed
```

### shadow_theses
```
id, user_id, title, slug?, status (draft|live|weakening|stale|invalidated|archived),
conviction (1-5), time_horizon, summary, thesis_body, why_now?,
invalidation_conditions?, watch_signals?, started_at?, last_reviewed_at?,
archived_at?, created_at, updated_at
```

### shadow_thesis_symbols
```
id, shadow_thesis_id, symbol, created_at
```

### shadow_thesis_updates
```
id, shadow_thesis_id,
update_type (new_evidence|conviction_change|status_change|review|lesson|warning),
title?, body, conviction_before?, conviction_after?, status_before?, status_after?, created_at
```

### shadow_calendar_events
```
id, user_id, title,
event_type (earnings|macro|product_event|guidance|investor_day|lockup|fda|news|review_case|review_thesis|custom),
event_date, event_time?, timezone?,
status (upcoming|done|cancelled|missed),
importance (low|medium|high|critical)?,
symbol?, thesis_id?, shadow_case_id?,
source_type (manual|imported|derived_from_case|derived_from_thesis),
description?, outcome_note?, created_at, updated_at
```

---

## 9. UI Views

### Dashboard (`/`)
- Portfolio summary cards by platform
- Realized P/L cards: today / week / month / all-time
- Weekly goal progress card
- Platform summary table
- Bucket budget usage: short / mid / long
- Recent trades
- Top gainers / losers by realized P/L
- Filters: platform, bucket, date range, symbol
- **Global header:** `Last sync was <datetime>` with small sync icon (Synced / Refreshing / Delayed)

### Trades (`/trades`)
- Top filters: date range, platform, symbol, bucket, action type
- Table columns: date, platform, symbol, action (buy/sell), qty, price, gross amount, fee, bucket, notes, realized P/L (sell rows)
- Actions: add / edit (drawer or modal) / delete / duplicate

### Positions (`/positions`)
- Filters row
- Grouped table by platform
- Columns: platform, symbol, bucket, open qty, avg cost, invested, current price, market value, realized P/L, unrealized P/L, total P/L, last trade date, **RSI badge**

### Performance (`/performance`)
- Tabs: Daily / Weekly / Monthly / Yearly
- Metrics per period: total buys, total sells, realized profit, realized loss, net P/L, cumulative P/L, goal target, goal progress %
- Optional cumulative P/L chart

### Platforms (`/platforms`)
- List with per-platform totals: invested / current value / realized P/L / unrealized P/L
- Create / edit / archive platform

### Watchlist (`/watchlist`)
- Table or cards: symbol, company name, platform, thesis/note, target buy price, target sell price, status, tags
- Status filter
- Add / edit item dialog

### Symbols (`/symbols`)
- Table columns: Symbol, Price, Daily %, RSI (badge with state label), Trend, Volume, Watchlist status, Actions
- RSI filter chips: `RSI < 30` · `RSI > 70` · `Neutral RSI`
- Symbol detail drawer: RSI 14, updated timestamp, sync metadata

---

## 10. RSI Integration

### Architecture
One RSI sync pipeline writes to `rsi_snapshots`. One shared RSI badge component used across Symbols, Positions, and Shadow Trading with consistent terminology and visual style.

### RSI states
| Range | State |
|---|---|
| < 30 | Oversold |
| 30–40 | Near Oversold |
| 40–60 | Neutral |
| 60–70 | Near Overbought |
| > 70 | Overbought |

### RSI badge design
Numeric value + tiny state label + subtle color treatment. No large heatmap blocks.

### Per-area usage
- **Symbols:** primary home of RSI; filter chips; detail drawer shows RSI history and sync timestamp
- **Positions:** RSI as decision context (labels: Stretched, Neutral, Oversold Risk, Momentum Strong)
- **Shadow Trading:** RSI recorded in start/end snapshot; shown in case review and lesson notes (Entry RSI, Current RSI)

### Global header sync status
Always visible, non-intrusive: `Last sync was Apr 21, 23:48` · small icon · state label

---

## 11. Shadow Trading (`/shadow`)

### Purpose
Capture a directional idea on a symbol, freeze the starting context, observe what happened, and conduct structured post-analysis. The core value is **decision review**, not fake execution.

### KPI row
Open Cases · Reviewed Cases · Accuracy Rate · Avg Move vs Thesis · Biggest Miss · Best Call

### Shadow Case
Core entity representing one tracked idea from entry to review.

**Minimum required fields:** symbol, direction (up/down/watch), started_at, entry_price, thesis

**Optional at creation:** platform, bucket, confidence (1-5), time_horizon, tags

**Status flow:** `open` → `review_ready` → `closed` → `archived`

**Outcome values:** `correct` · `wrong` · `mixed` · `invalidated` · `unreviewed`

### Start Snapshot
Frozen context captured at case creation — prevents hindsight pollution:
- symbol, price, datetime
- optional: daily % move, market session state, catalyst type (earnings/news/technical/macro/other), RSI at entry

### Review Flow
1. Create case with thesis, direction, entry price
2. Observe while case stays open
3. Click "Review Now" — system shows end price, move %, direction match
4. User writes structured explanation: what happened, why, what invalidated thesis, lessons learned
5. Filter and inspect patterns over time (wrong calls, high confidence misses, etc.)

### Case detail sections
- **Thesis:** original thesis, direction, confidence, horizon, created timestamp
- **Market Result:** entry vs end price, move abs/%, direction match
- **Why:** what happened · why it happened · what invalidated thesis · what was missed · what to watch next
- **Catalysts:** manual links
- **Notes timeline:** chronological typed notes per case

### Useful filters
symbol · direction · outcome · platform · bucket · tag · horizon · confidence range · started/reviewed date range

---

## 12. Shadow Theses (`/shadow/theses`, `/shadow/theses/[id]`)

### Purpose
Higher-level narrative containers that group multiple shadow cases under one durable market idea. Answers: "What bigger idea was I trading around?" and "Is this thesis still valid?"

Examples: AI infrastructure capex cycle · Oil recovery after oversold panic · Rate cut expectations lifting speculative names

### Status flow
`draft` → `live` → `weakening` → `stale` → `invalidated` → `archived`

### Relationship
One thesis → many shadow cases (MVP). A shadow case has one optional `thesis_id`.

### Thesis detail page sections
- **Header:** title, status badge, conviction, horizon, dates
- **Core Narrative:** summary, thesis body, why now, invalidation conditions, watch signals
- **Linked Cases:** table — symbol, direction, outcome, move %, status, quick link
- **Update Timeline:** chronological conviction changes, new evidence, warnings, lessons
- **Learnings:** what worked, what failed, what to repeat, what to stop

### Derived metrics (computed on read)
linked cases count · open/reviewed count · accuracy % · avg move · thesis age · days since last review

---

## 13. Catalyst Calendar (`/shadow/calendar`)

### Purpose
Track upcoming events that may move shadow cases and schedule review reminders. Not a generic task calendar — only events relevant to Shadow Trading.

Good event types: earnings · CPI · FOMC · jobs report · product launch · investor day · FDA decision · lockup expiry · thesis review reminder · manually added catalyst

### Event type enum
`earnings` · `macro` · `product_event` · `guidance` · `investor_day` · `lockup` · `fda` · `news` · `review_case` · `review_thesis` · `custom`

### Calendar views
- **Agenda** (recommended MVP default) — date-grouped list, easiest to scan and filter
- **Week** — good for catalyst-heavy periods
- **Month** — overview grid with compact event pills

### Useful filters
event type · symbol · linked thesis · linked case · importance · upcoming/past

### Useful derived sections
- Upcoming this week
- Overdue reviews
- Recently passed catalysts
- Events without outcome note

### Main workflows
1. **Add manual catalyst** — title, date, type, importance, optional symbol/case/thesis
2. **Add review reminder from case** — pre-fills `review_case` type, linked case id, symbol
3. **Add thesis review reminder** — from thesis page, creates `review_thesis` event
4. **Record outcome** — after event passes, user adds outcome note and catalyst verdict
5. **Filter week cluster** — high importance + earnings + linked to open cases

### Data rules
- Event deletion must not delete linked case or thesis
- Calendar bugs must not affect real trade or shadow case storage
- Events creatable without a symbol; review events should link to a case or thesis

---

## 14. Workflows

### First-time setup
1. Sign in with social login
2. System creates default buckets: Short term, Mid term, Long term
3. User adds platforms and sets bucket budgets
4. User sets weekly profit goal

### Add buy trade
Trades → Add trade → select platform → select/create symbol → Buy → date, qty, price, fee, bucket → Save → positions recalculate

### Add sell trade
Trades → Add trade → platform + symbol → Sell → qty, price, fee, bucket → system validates available open qty → Save → FIFO matches created → realized P/L recalculated

### Edit historical trade
Edit → system marks dependent calculations dirty → rebuilds lot matches for that user/platform/symbol/bucket scope from that date forward → refreshes summaries → UI warns P/L may change

### Review weekly goal
Dashboard shows: current week realized P/L vs target, delta to target, hit/missed status

### Shadow case lifecycle
New Case → Start Tracking (freeze snapshot) → observe → Review Now → structured outcome explanation → archive

### Shadow thesis lifecycle
New Thesis → link cases (existing or newly created) → add updates over time → mark invalidated with reason → review linked case performance

### Catalyst calendar
Add Event → fill title, date, type, importance, optional symbol/case/thesis → appears in agenda view → after date passes, add outcome note

---

## 15. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Tables usable with 10,000+ trade rows; dashboard summaries feel fast; recalculations incremental |
| Accuracy | P/L calculations deterministic; consistent currency rounding |
| Security | All data access scoped by authenticated user id; server-side validation on all mutations |
| Auditability | User can inspect raw trades and FIFO lot matches behind every P/L figure |
| Currency | One currency per platform in v1; no FX conversion |

---

## 16. v1 Priorities

### Must-have
auth · platform CRUD · symbol CRUD · trade CRUD · FIFO realized P/L · positions view · dashboard · weekly goal tracking · watchlist · RSI sync pipeline + shared badge component · shadow case create/review/notes/filters · shadow theses list + detail · catalyst calendar (agenda view)

### Nice-to-have
manual current price snapshots · cumulative P/L chart · tags on trades · CSV import · shadow saved filter views · shadow scenario type labels
