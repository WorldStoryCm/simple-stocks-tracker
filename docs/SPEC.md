# Stock Tracker — Product Specification

A personal, manual stock journal and performance tracker for people who actively buy and sell across multiple platforms and want clear, reproducible profit/loss visibility — without broker sync, without spreadsheets, without taxes-and-options bloat.

---

## 1. Positioning

**One-line:** A personal stock journal that turns your trades into clean P/L, RSI-aware positions, and a structured place to track ideas you *didn't* trade.

**Pillars** (these double as landing-page section anchors):

1. **Multi-platform manual ledger** — log every buy/sell across all your brokers in one place
2. **Realized & unrealized P/L** — FIFO matching, deterministic, fully auditable
3. **Capital curves** — cumulative P/L over 1M / 3M / 1Y / All-time
4. **Wins/Losses tracking** — win rate, P/L by symbol, recent trades, per-period performance
5. **RSI badges everywhere** — same RSI signal shown on Symbols (watchlist), Positions, and Shadow cases
6. **Shadow Trading** — capture ideas you didn't act on, freeze entry context, review later
7. **Goals** — monthly and yearly profit goals with live progress
8. **Mobile-ready** — every page works on a phone

---

## 2. Scope

### In scope (shipped)
- Auth (social login via Better Auth)
- CRUD: platforms, symbols (watchlist), trades
- FIFO realized P/L with persisted lot matches
- Unrealized P/L from live quotes
- Dashboard with KPIs, cumulative P/L chart, goals, platforms summary, recent trades, P/L by symbol
- Per-period performance (Daily / Weekly / Monthly / Yearly) with realized P/L and win rate
- Positions view with table + heatmap, grouped by platform
- Trades log with filters (date, symbol, platform, action) and sortable columns
- Platforms page with per-platform totals
- Symbols page (watchlist) with RSI badges, ticker-catalog search, RSI backtest
- Shadow Trading (cases): create, observe, review, archive
- Goals: monthly / yearly profit goals
- Capital Progress settings (starting capital + monthly contributions)
- Ticker catalog autocomplete

### Out of scope (v1)
- Automatic broker sync / CSV import
- Tax reporting
- Dividends, options, forex, crypto
- Multi-user collaboration
- Margin/short borrowing
- Shadow Theses (narrative containers grouping multiple cases) — *planned, not built*
- Catalyst Calendar — *planned, not built*

---

## 3. Tech stack

- **Frontend:** Next.js (app router), React, TypeScript, Tailwind, shadcn-style components, Recharts, lucide-react
- **Backend:** tRPC routers (thin) → services (`app/server/services/*`) → Drizzle ORM → PostgreSQL
- **Auth:** Better Auth
- **Validation:** Zod
- **Quotes:** live quote provider via `lib/live-quotes.ts`
- **RSI:** snapshot-cached pipeline in `lib/rsi.ts`

**Architecture rules** (see `AGENTS.md`):
- Files capped at ~250 lines — split features into `components/` and `use<Feature>View.ts` hooks
- tRPC routers are thin (input schema → auth → service call → return). All logic lives in `app/server/services/<domain>.ts`.

---

## 4. Core concepts

| Concept | Description |
|---|---|
| Platform | A broker/account (e.g. Revolut, IBKR). One currency per platform. |
| Symbol | A ticker the user has chosen to track / watch. Acts as the watchlist. |
| Trade | A buy or sell record in the raw ledger. Source of truth. |
| Lot Match | A FIFO pairing between a sell trade and one or more prior buys. |
| Position | Derived open holding scoped by user × platform × symbol. |
| Realized P/L | Sum of `realized_pnl` over matched lots. |
| Unrealized P/L | `open_qty × live_price − open_cost_basis`. |
| Goal | Monthly or yearly profit target. |
| Shadow Case | A tracked idea you didn't execute on — entry context, thesis, outcome. |
| RSI Snapshot | A cached `indicatorSnapshots` row per ticker, refreshed on demand. |

---

## 5. P/L logic

**Method:** FIFO. Deterministic, reproducible, easy to explain.

```
realized_pnl   = sell_proceeds − matched_buy_cost − fees
sell_proceeds  = sell_qty × sell_price
matched_buy_cost = Σ FIFO-matched buy lots

unrealized_pnl = open_qty × live_price − open_cost_basis
```

**Rules:**
- Sell quantity cannot exceed open quantity for that symbol × platform
- Editing or deleting a historical trade triggers FIFO rematch for the affected scope from that date forward
- All summaries reproducible from raw trades — no hidden state

---

## 6. Database schema (current)

Source of truth: `db/schema/app.ts` and `db/schema/auth.ts`.

| Table | Purpose |
|---|---|
| `platforms` | Brokers/accounts. `(user_id, name)` unique. |
| `symbols` | User's tracked tickers (the watchlist). `(user_id, ticker)` unique. |
| `trades` | Raw ledger of buys and sells. |
| `trade_lot_matches` | Persisted FIFO matches for auditability and incremental recompute. |
| `goals` | `goal_type ∈ {monthly_profit, yearly_profit}`, `amount`, `is_active`. |
| `capital_progress_settings` | Starting capital + monthly contribution config. |
| `shadow_cases` | One tracked idea: thesis, direction, entry/exit, outcome, status. |
| `shadow_notes` | Typed notes on a case (thesis / observation / review / lesson). |
| `indicator_snapshots` | Cached RSI (and future indicators) per ticker. Shared across features. |
| `ticker_catalog` | Autocomplete source for ticker search. |
| `user`, `session`, `account`, `verification` | Managed by Better Auth. |

All app rows are scoped by `user_id`. Every query funnels through services that take `userId` as the first argument.

---

## 7. Surface map (real, shipped)

Routes live under `app/(app)/`.

### `/` — Dashboard
- KPIs: **Month P/L**, **All-time P/L**
- **Goals** card — monthly and yearly progress bars
- **Cumulative P/L (All-time)** chart with **1M / 3M / 1Y / All-time** toggle
- **Platforms Summary** card
- **Recent Trades** card
- **P/L by Symbol** card
- Filters: platform, date range, symbol

### `/trades` — Trades log
- Tabs: **All Actions / Buy / Sell**
- Filters: symbol, platform, action
- Sortable columns: **Date, Symbol, Platform, Type, Price, Qty, P/L** (for sells)
- Add / edit / delete via dialog

### `/positions` — Positions
- Tabs: **Table / Heatmap**
- Grouped by platform
- Columns: symbol, open qty, avg cost, invested, live price, market value, realized P/L, unrealized P/L, total P/L, **RSI badge**
- Heatmap (recharts Treemap) sized by exposure, colored by P/L

### `/performance` — Performance
- **Portfolio Growth** chart
- Per-period tabs (Daily / Weekly / Monthly / Yearly): **{Period} Performance** breakdown
- KPI cards: **Realized P/L**, **Win Rate**

### `/platforms` — Platforms
- Per-platform totals (invested / current value / realized / unrealized)
- Create / edit / archive

### `/symbols` — Symbols (the watchlist)
- Ticker-catalog search to add new symbols
- Columns: ticker, price, daily %, RSI badge with state label, trend, actions
- RSI **backtest** action — `/symbols` → backtest dialog (RSI < 35 crossing over ~400 daily closes)
- "Last sync was …" status line

### `/shadow` — Shadow Trading
- Header: title + **New Case** button
- Tabs: **Open / Closed / Archived**
- Main: cases table (symbol, entry price, current price, change %, RSI, days open, status/outcome badge)
- Right rail: KPIs and quick context
- Review drawer: structured outcome capture

### `/settings` — Settings
- Goals editor (monthly / yearly)
- Capital Progress: starting capital + monthly contribution amount

---

## 8. RSI integration

**Single source of truth:** `indicator_snapshots`, written by `lib/rsi.ts`, served via the `rsi` tRPC router → `rsiService`.

**Badge states:**

| Range | State |
|---|---|
| < 30 | Oversold |
| 30–40 | Near Oversold |
| 40–60 | Neutral |
| 60–70 | Near Overbought |
| > 70 | Overbought |

**Where it shows up:**
- **Symbols** — primary home, filter chips, sync timestamp
- **Positions** — decision context next to each open holding
- **Shadow cases** — entry RSI frozen at case creation; current RSI on open cases

**Backtest:** `rsiService.backtest(ticker, rsiTicker?)` simulates an RSI-below-35 crossing entry strategy over ~400 daily closes.

---

## 9. Shadow Trading

**Purpose:** capture a directional idea on a symbol, freeze the starting context, observe what happens, and review it honestly. The product value is **decision review**, not fake execution.

**Case fields (minimum):** symbol, direction, started_at, entry_price, thesis
**Optional:** platform, confidence (1–5), time_horizon
**Status flow:** `open` → `closed` → `archived`
**Outcomes:** `correct` · `wrong` · `mixed` · `invalidated` · `unreviewed`

**Notes types:** `thesis_note` · `observation_note` · `catalyst_note` · `review_note` · `lesson_note`

**Review flow:**
1. New Case → freeze entry price + entry RSI + thesis
2. Observe while open (live current price + current RSI shown in table)
3. Click Review → drawer with end price, % move, direction match
4. Write structured outcome — what happened, why, what to watch next
5. Filter and inspect patterns (wrong calls, missed catalysts, high-confidence misses)

---

## 10. Workflows

**First-time setup**
Sign in → add a platform → add symbols you care about → set monthly/yearly goals → optionally set starting capital.

**Add a buy**
Trades → Add → platform, symbol, Buy, date, qty, price, fee → save → positions recompute.

**Add a sell**
Trades → Add → platform + symbol, Sell, qty, price, fee → server validates open qty → FIFO matches written → realized P/L updates.

**Edit a historical trade**
Edit → server marks dependent matches dirty → rebuilds FIFO from that date forward for the same user × platform × symbol scope.

**Track an idea you didn't trade**
Shadow → New Case → symbol, direction, entry price, thesis → observe → Review → outcome + lessons → archive.

**Review monthly goal**
Dashboard → Goals card → live monthly + yearly progress vs target.

---

## 11. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Tables remain usable with 10k+ trade rows; dashboard feels instant on cached data |
| Accuracy | P/L deterministic, currency rounding consistent, FIFO reproducible from raw trades |
| Security | Every query scoped by authenticated `userId` server-side; no client-trusted user ids |
| Auditability | User can inspect raw trades and FIFO lot matches behind every P/L figure |
| Currency | One currency per platform; no FX conversion in v1 |
| Responsive | Every page works on phone widths; touch targets ≥ 44px |

---

## 12. Landing page — content brief

Build the landing page from the pillars in §1 and the surfaces in §7. Suggested section flow:

1. **Hero** — one-line positioning, primary CTA "Start your journal", secondary "See the dashboard". Composite screenshot of Dashboard with a phone overlay (mirrors `docs/mock.png`).
2. **The problem** — "Your trades live in 4 brokers and a Notes app. Your P/L is a guess."
3. **Pillar grid (6 tiles)** — Multi-platform ledger · Realized & unrealized P/L · Capital curves · Wins/Losses · RSI badges · Shadow Trading.
4. **Feature deep-dives (alternating screenshot left/right):**
   - Dashboard — KPIs, cumulative P/L, goals
   - Positions — table + heatmap with RSI badges
   - Trades — filterable log, FIFO realized P/L per sell
   - Performance — daily/weekly/monthly/yearly + win rate
   - Symbols — watchlist with RSI states and backtest
   - Shadow Trading — track what you almost did
5. **"Built like a journal, not a brokerage"** — manual, auditable, FIFO, your data, your file.
6. **Mobile** — phone screenshot strip.
7. **What's not here** — short, honest list (no broker sync, no taxes, no options) — signals focus.
8. **CTA** — sign in with Google.

**Voice:** terse, second-person, no jargon stacking. "You logged 142 trades this year. Here's what they made you." over "Comprehensive portfolio analytics."
