# Stock Tracking App — Product Specification

## 1. Goal
Build a simple stock tracking app for personal investing/trading across multiple platforms.

The app must let a user:
- record multiple buy transactions for the same stock
- record multiple sell transactions for the same stock
- track realized profit/loss per closed position or partial close
- track day, week, and month performance
- separate capital into buckets such as short-term, mid-term, and long-term
- define profit goals such as `$100 profit per week`
- manage multiple brokers/platforms such as Revolut and N26
- maintain a watchlist

This is **not** a broker integration product in v1. It is a manual tracking and reporting app.

---

## 2. Product Scope

### In scope for v1
- authentication with social login
- single-user personal portfolio tracking
- CRUD for platforms
- CRUD for stocks / symbols
- CRUD for buy transactions
- CRUD for sell transactions
- manual assignment of trade horizon/bucket
- realized P/L tracking
- unrealized P/L support via manual current price entry or optional manual stock snapshot entry
- dashboard with cumulative stats by day/week/month
- weekly profit goal tracking
- watchlist
- table views and summary views

### Out of scope for v1
- automatic broker sync
- direct market data integration
- tax reporting by country
- dividends/options/forex/crypto support
- multi-user collaboration
- advanced charting
- import from broker statements
- margin/short borrowing mechanics

---

## 3. Core User Stories

### Trading records
- As a user, I want to create a platform like `Revolut` or `N26` so I can separate my trades by broker.
- As a user, I want to create or select a stock symbol like `RCAT`, `FTAI`, `HUM`, `ASPI` when recording trades.
- As a user, I want to record multiple buys for the same stock over time.
- As a user, I want to record one or more sells for the same stock over time.
- As a user, I want the system to calculate realized profit/loss when I sell.
- As a user, I want partial sells to work correctly.

### Portfolio buckets
- As a user, I want to categorize trades or positions into:
  - short-term
  - mid-term
  - long-term
- As a user, I want to define capital budgets for each bucket, for example:
  - short-term: `$5,000`
  - mid-term: `$10,000`
  - long-term: `$20,000`
- As a user, I want to see how much of each bucket is currently used.

### Goal tracking
- As a user, I want to set a weekly profit goal such as `$100`.
- As a user, I want to see if I hit or missed the goal for each week.
- As a user, I want cumulative profit totals for day, week, month, and all-time.

### Watchlist
- As a user, I want to maintain a watchlist of symbols I am monitoring.
- As a user, I want to add notes and a target thesis for watchlist entries.

---

## 4. Key Concepts

### Platform
A trading provider or account source, for example `Revolut`, `N26`, or other manual broker accounts.

### Stock
A tradable symbol or asset being tracked, for example `RCAT` or `FTAI`.

### Trade bucket
A user-defined investment horizon bucket:
- short-term
- mid-term
- long-term

### Buy transaction
A transaction that increases position quantity.

### Sell transaction
A transaction that decreases position quantity and may realize P/L.

### Position
A position is the current open holding for a symbol within a platform and bucket.

### Closed lot / realized position
A fully or partially sold portion of previously bought quantity that creates realized P/L.

---

## 5. Profit/Loss Logic

### Required accounting method
Use **FIFO** in v1.

Reason:
- simpler to understand
- easier to explain in UI
- deterministic for partial sells
- matches many user expectations for manual tracking

### Realized P/L formula
For each sold quantity:

`realized_pnl = sell_proceeds - matched_buy_cost - fees`

Where:
- `sell_proceeds = sell_qty * sell_price`
- `matched_buy_cost = sum of FIFO-matched buy lots`
- `fees` = sell fee + proportional matched buy fees if tracked

### Unrealized P/L formula
For open quantity:

`unrealized_pnl = market_value - open_cost_basis`

In v1, market value can be based on a manually entered current price or latest manual snapshot.

### Position metrics required
For each open position show:
- total bought quantity
- total sold quantity
- open quantity
- average open cost
- invested amount
- realized P/L
- unrealized P/L
- total P/L

---

## 6. Main Screens

## 6.1 Dashboard
Purpose: quick overview.

Widgets:
- total invested by platform
- total portfolio value by platform
- realized P/L today
- realized P/L this week
- realized P/L this month
- realized P/L all-time
- open positions count
- weekly goal progress
- bucket usage: short / mid / long
- recent trades

### Dashboard filters
- platform
- bucket
- date range
- symbol

---

## 6.2 Trades Table
Purpose: manual trade recording and audit trail.

Columns:
- date
- platform
- symbol
- action (`buy` / `sell`)
- quantity
- price
- gross amount
- fee
- bucket
- notes
- realized P/L for sell rows

Actions:
- add trade
- edit trade
- delete trade
- duplicate trade
- filter and sort

---

## 6.3 Positions View
Purpose: current holdings.

Columns:
- platform
- symbol
- bucket
- open quantity
- avg cost
- invested amount
- current price
- market value
- realized P/L
- unrealized P/L
- total P/L
- last trade date

---

## 6.4 Performance View
Purpose: stats over time.

Views:
- daily
- weekly
- monthly
- yearly

Metrics per period:
- total buys
- total sells
- realized profit
- realized loss
- net realized P/L
- cumulative P/L
- goal target
- goal progress %

---

## 6.5 Platforms View
Purpose: manage trading accounts.

Data:
- platform name
- broker type (manual text)
- currency
- active/inactive
- notes

Show per platform:
- invested total
- current total value
- realized P/L
- unrealized P/L

---

## 6.6 Watchlist View
Purpose: symbols to monitor before trading.

Fields:
- symbol
- company name optional
- platform optional
- thesis / note
- target buy price optional
- target sell price optional
- status (`watching`, `ready`, `bought`, `archived`)
- tags

---

## 7. Example Workflows

### Workflow A — Buy stock
1. User opens Trades page.
2. User clicks `Add trade`.
3. User selects platform.
4. User selects or creates symbol.
5. User chooses `Buy`.
6. User enters date, quantity, price, fee, bucket.
7. System saves trade.
8. Position recalculates.

### Workflow B — Sell stock partially
1. User opens Trades page.
2. User adds a `Sell` trade.
3. User enters quantity lower than current open quantity.
4. System matches FIFO lots.
5. System calculates realized P/L.
6. System updates remaining open quantity.

### Workflow C — Weekly goal tracking
1. User sets a weekly realized profit goal, e.g. `$100`.
2. At any time dashboard shows:
   - current week realized P/L
   - target value
   - delta to target
   - hit/missed status

### Workflow D — Platform summary
1. User opens Platforms page.
2. User sees totals like invested vs total value per platform.
3. User can drill into trades and positions for that platform.

---

## 8. Data Rules / Invariants

### Core invariants
- sell quantity must never exceed available open quantity for that symbol/platform/bucket scope
- a trade belongs to exactly one user
- a trade belongs to exactly one platform
- a trade belongs to exactly one symbol
- all calculations must be reproducible from raw trades
- deleting or editing a historical trade must trigger recalculation of affected positions and realized P/L
- bucket totals must reflect open capital allocation

### Design choice for position scope
Open positions should be grouped by:
- user
- platform
- symbol
- bucket

That prevents mixing short-term and long-term capital for the same symbol unless the user intentionally records them in the same bucket.

---

## 9. Reporting Requirements

### Time aggregation
Need aggregated stats by:
- day
- week
- month
- year
- custom date range

### Required reports
- realized P/L by day/week/month
- cumulative realized P/L by month
- platform performance summary
- bucket performance summary
- symbol performance summary
- best and worst trades
- open exposure by bucket

### Excel-like views to support
The app should support tables similar to the user's existing spreadsheet:
- symbol rows with buy/sell/profit grouped by date or month
- platform summary with invested/total/profit snapshots

Do not try to exactly clone Excel in v1. Provide cleaner app-native reports first.

---

## 10. Authentication

Use **Better Auth** with social login.

Recommended providers for v1:
- Google
- Apple optional

Requirements:
- user can sign in with social login
- user data is isolated by `userId`
- app supports one personal portfolio per user in v1

---

## 11. Technical Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind
- shadcn/ui

### Backend
- Next.js server actions or tRPC/API routes
- Better Auth
- Drizzle ORM
- PostgreSQL

### Optional libraries
- TanStack Table for dense tables
- Recharts for basic charts
- Zod for validation
- date-fns for grouping by day/week/month

---

## 12. Non-Functional Requirements

### Performance
- tables must remain usable with at least 10,000 trade rows for a single user
- dashboard summaries should feel fast
- expensive recalculations should be incremental or done server-side when possible

### Accuracy
- profit/loss calculations must be deterministic
- rounding should use consistent currency precision rules

### Security
- all data access scoped by authenticated user id
- server-side validation required

### Auditability
- user must be able to inspect raw trades behind every calculation

---

## 13. Suggested v1 Priorities

### Must-have
- auth
- platform CRUD
- stock CRUD
- trade CRUD
- FIFO realized P/L
- positions view
- dashboard
- weekly goal tracking
- watchlist basic CRUD

### Nice-to-have
- manual current price snapshots
- charts
- tags
- notes on trades
- CSV import

---

## 14. Open Questions
- Should current prices be fully manual in v1, or should there be optional market data later?
- Should goals be only weekly, or also monthly/yearly?
- Should symbols be global across platforms, or duplicated per market/currency?
- Should fees be required or optional?
- Should the app support multiple currencies in v1 or lock to one base currency per user?

---

## 15. Recommended v1 Positioning
This product should be positioned as:

**A simple manual stock journal and performance tracker for people who actively buy and sell across multiple platforms and want clear profit/loss visibility without broker sync complexity.**
