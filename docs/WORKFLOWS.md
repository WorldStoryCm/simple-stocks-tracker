# Stock Tracking App — Workflows

## 1. First-time setup
1. User signs in with social login.
2. System creates default buckets:
   - Short term
   - Mid term
   - Long term
3. User adds one or more platforms.
4. User sets budgets per bucket.
5. User sets weekly profit goal.

---

## 2. Add buy trade
1. Open Trades.
2. Click Add trade.
3. Choose platform.
4. Choose or create symbol.
5. Set action to Buy.
6. Enter date, quantity, price, fee, bucket.
7. Save.
8. System updates positions and summaries.

---

## 3. Add sell trade
1. Open Trades.
2. Click Add trade.
3. Choose platform and symbol.
4. Set action to Sell.
5. Enter date, quantity, price, fee, bucket.
6. System validates that enough open quantity exists.
7. Save.
8. System creates FIFO matches.
9. System recalculates realized P/L.

---

## 4. Edit historical trade
1. User edits buy/sell trade.
2. System marks dependent calculations dirty.
3. System rebuilds lot matches for affected scope.
4. System refreshes summaries.
5. UI warns that downstream P/L may change.

---

## 5. Review weekly progress
1. User opens dashboard.
2. Dashboard shows current week realized P/L.
3. Dashboard compares value to weekly goal.
4. System displays remaining amount or success state.

---

## 6. Manage watchlist
1. User opens Watchlist.
2. Adds symbol.
3. Enters thesis, target prices, and notes.
4. Optionally marks as ready.
5. After actual purchase, user can mark the item as bought or link to a created trade.
