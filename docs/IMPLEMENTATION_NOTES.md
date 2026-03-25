# Stock Tracking App — Implementation Notes

## 1. Recommended architecture
- Next.js app router
- Better Auth for auth/session
- Drizzle ORM with Postgres
- Server-side mutations for trade writes
- Derived reads through SQL views or service layer

## 2. Calculation strategy
Do not store only final P/L values.
Store raw trades and reproducible lot matches.

Best approach:
- raw trades = source of truth
- lot match table = explainable derived layer
- position snapshots = optional performance cache

## 3. Recalculation scope
When a trade changes, recalculate only affected subset:
- same user
- same platform
- same symbol
- same bucket
- from earliest modified trade date forward

## 4. Currency handling
For v1, keep one currency per platform and assume no FX conversion.
If multi-currency is needed later, add base-currency conversion tables.

## 5. Validation rules
- quantity > 0
- price > 0
- fee >= 0
- sell quantity cannot exceed available open quantity
- trade_date required

## 6. Suggested future upgrades
- CSV import
- broker statement import
- live/manual price refresh
- dividend tracking
- notes and attachments per trade
- alerts for weekly goal pace
