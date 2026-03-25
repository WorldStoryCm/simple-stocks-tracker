# Stock Tracking App — Feature Breakdown

## 1. Authentication
- Social login with Better Auth
- Session handling
- Protected app routes

## 2. Platforms
- Create platform
- Edit platform
- Archive platform
- Delete platform if no trades depend on it, or soft delete

## 3. Stocks / Symbols
- Create symbol
- Edit symbol metadata
- Search/select symbol in forms
- Optional company name and notes

## 4. Trades
- Create buy trade
- Create sell trade
- Edit trade
- Delete trade
- Validate quantity and price
- Recalculate affected positions after changes

## 5. Positions
- Current holdings per platform + symbol + bucket
- Avg cost basis
- Open quantity
- Realized P/L
- Unrealized P/L

## 6. Performance
- Daily summary
- Weekly summary
- Monthly summary
- Cumulative P/L
- Goal progress

## 7. Goals
- Weekly profit target
- Later: monthly/yearly targets

## 8. Watchlist
- Add symbol to watchlist
- Notes / thesis
- Target price fields
- Status and tags

## 9. Reports
- Platform summary
- Symbol summary
- Bucket summary
- Period summary

## 10. Admin / Settings
- Base currency
- Default bucket labels
- Goal settings
- Rounding / number display preferences
