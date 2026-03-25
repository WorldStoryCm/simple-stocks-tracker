# Phase 1: Database Schema & Backend Setup

## Objectives
- Implement the database schema described in `DB_SCHEMA.md` using Drizzle ORM.
- Create API endpoints / tRPC routers for base entities.

## Tasks
- [x] Create schema definitions for `platforms`, `symbols`, `buckets`, `trades`, `trade_lot_matches`, `goals`, `watchlist_items`, `watchlist_tags`, `watchlist_item_tags`.
- [ ] Run `drizzle-kit generate` and `drizzle-kit push` (or migrate) to update the local database.
- [x] Create tRPC routers (`app/server/routers/`) for:
  - `platforms` (CRUD)
  - `symbols` (CRUD)
  - `buckets` (CRUD + initialization)
  - `trades` (Basic CRUD without FIFO logic yet)
- [x] Ensure authentication enforcement (Better Auth) on all new tRPC routes.
