# Phase 3: Trading Mechanics & Positions

## Objectives
- Build the core trading ledger and implement FIFO logic for sells.
- Derive open positions and calculate Realized/Unrealized P/L.

## Tasks
- [x] Build **Trades Page**: Tableview of all historical trades with filters (date, platform, symbol).
- [x] Build **Add Trade Dialog**: Support for Buy and Sell flows.
- [x] Implement **FIFO Match Logic** on the backend when recording a `Sell` trade (creating `trade_lot_matches`).
- [x] Implement **Position Calculation Service** to derive current holdings, average cost, and invested amounts from `trades` and `trade_lot_matches`.
- [x] Build **Positions Page**: Grouped view showing current open positions per platform/bucket/symbol.
