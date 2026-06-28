# Revolut Import And Dividends Plan

## Goal

Import missing broker activity from exported files, starting with Revolut CSV exports, while keeping buy/sell trades, dividends, taxes, fees, and unsupported corporate actions distinct enough to audit.

## Phase 1 - Data Model

- Add a `cash_events` table for dividends and other cash-only broker events.
- Keep dividends separate from `trades` so FIFO lots and open positions are not polluted.
- Add import batch/row tracking for auditability.
- Add import source metadata to trades so repeated imports can be detected.
- Increase trade quantity precision from 4 to 8 decimal places for fractional-share broker exports.

## Phase 2 - Server Import Pipeline

- Add an import service with adapter-based parsing.
- Start with a Revolut adapter for CSV exports.
- Normalize rows into trade, cash-event, unsupported, or ignored rows.
- Match possible duplicates using:
  - source system
  - platform
  - ticker
  - buy/sell type or cash-event type
  - date tolerance
  - quantity tolerance for trades
  - amount tolerance for dividends/taxes
- Commit selected new rows in one database transaction, sorted by broker date.

## Phase 3 - Dividends Tab

- Add a sidebar tab for Dividends.
- Show dividend and dividend-tax events with filters by broker, symbol, event type, and date.
- Show summary totals for gross dividends, dividend tax, net dividends, and row count.

## Phase 4 - Trading Ledger Import Dialog

- Add an Import button to the Trading Ledger.
- Dialog flow:
  - choose source system
  - choose platform
  - upload/export file
  - preview parsed rows
  - select rows to import
  - commit selected rows
- First supported file type: Revolut CSV. IBKR/N26 and PDF/XLSX parsing remain adapter extensions.

## Phase 5 - Dashboard Dividends Section

- Add dividend metrics to the dashboard:
  - current filtered dividend total
  - tax total
  - net dividends
  - recent dividend rows
- Keep trade P/L and dividend income visibly separate.

## Phase 6 - Later Broker Adapters

- Add IBKR adapter.
- Add N26 adapter.
- Add XLSX/PDF extraction only after sample files are available.
- Add corporate actions for splits/mergers after the current position/FIFO model has explicit support.

## Acceptance Criteria

- Re-importing the same Revolut file does not duplicate already-imported rows.
- Buy/sell matching tolerates date movement and fractional quantity rounding.
- Dividends are importable and visible on a separate Dividends tab.
- Dashboard includes dividend totals without mixing them into sell-trade FIFO P/L.
- Unsupported stock splits and mergers are visible in preview but not silently imported.
