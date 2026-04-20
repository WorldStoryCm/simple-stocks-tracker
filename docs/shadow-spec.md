# shadow-spec.md

## 1. Goal

Build a separate **Shadow Trading** area for simulated ideas and post-analysis.

This is **not** a real ledger clone and **not** a paper broker terminal.  
The product goal is:

- capture an idea on a symbol
- freeze the starting context
- observe what happened after
- record whether the idea was correct or wrong
- explain **why**
- build a private library of trading judgments and mistakes

Primary value is **decision review**, not fake execution.

---

## 2. Product Positioning

Shadow Trading sits next to the real trading ledger but stays fully isolated.

It should answer:

- “What did I think would happen?”
- “What actually happened?”
- “How far did price move?”
- “Was I early, wrong, or right for the wrong reason?”
- “What news or event changed the outcome?”
- “What patterns repeat in my bad calls and good calls?”

This feature is closer to:

- thesis tracking
- scenario journaling
- post-mortem analysis
- idea validation

and less like:

- order book simulation
- advanced paper trading
- broker emulation

---

## 3. Routing & Isolation

Use a dedicated route:

- `/shadow`

Optional aliases later:

- `/sandbox`
- `/ideas`

Hard rule:

- Shadow Trading must use its **own tables**, queries, services, and UI flows.
- No shared writes with the real ledger.
- A bug in shadow data must never affect real trades, real holdings, or real P/L.

Recommended naming:

- `shadow_cases`
- `shadow_snapshots`
- `shadow_notes`
- `shadow_events`
- `shadow_tags`
- `shadow_case_tags`

---

## 4. MVP Philosophy

Do **not** model this as Buy/Sell first.

For MVP, the core entity is:

- **Shadow Case**

A shadow case means:

> “I selected a symbol at a specific moment, defined what I expected, and later reviewed what really happened.”

This is much more useful than pretending to place market orders.

Buy/sell simulation can be added later only if it clearly improves learning.

---

## 5. Core MVP Entity: Shadow Case

Each case represents one idea.

Example:

- Symbol: NVDA
- Start date: Apr 20
- Thesis: “Expected pullback after earnings reaction”
- Direction: Down
- Start price: 924.10
- End date: Apr 27
- End price: 971.20
- Result: Wrong
- Why: AI demand narrative stayed stronger than expected

### Required fields

- `id`
- `user_id`
- `platform_id` nullable
- `symbol`
- `bucket` nullable
- `started_at`
- `entry_price`
- `direction` (`up`, `down`, `watch`)
- `thesis`
- `confidence` nullable (1-5 or 0-100)
- `time_horizon` nullable (`intraday`, `swing`, `1w`, `1m`, `3m`, custom)
- `status` (`open`, `review_ready`, `closed`, `archived`)
- `ended_at` nullable
- `exit_price` nullable
- `price_change_abs` nullable
- `price_change_pct` nullable
- `outcome` nullable (`correct`, `wrong`, `mixed`, `invalidated`, `unreviewed`)
- `result_summary` nullable
- `created_at`
- `updated_at`

### Interpretation

- `direction=up`: idea was bullish
- `direction=down`: idea was bearish
- `direction=watch`: user wants to track the move without directional conviction

---

## 6. Snapshot at Start

The most important thing is freezing the context when the case is created.

Create a start snapshot so later analysis is not polluted by hindsight.

### Snapshot should store

- symbol
- company name if available
- captured price
- captured date/time
- optional daily % move at capture
- optional recent trend summary
- optional market session state
- optional notes entered immediately
- optional catalyst type:
  - earnings
  - news
  - analyst action
  - technical breakout
  - panic selloff
  - macro
  - sector sympathy
  - other

MVP rule:

- even if external market metadata is missing, the case must still be creatable
- minimum frozen context is:
  - symbol
  - started_at
  - entry_price
  - thesis
  - direction

---

## 7. Review Flow

The main workflow is:

### Step 1 — Create case
User chooses a symbol and records:

- thesis
- expected direction
- optional target horizon
- optional confidence
- optional tags

### Step 2 — Observe
Case stays open while price evolves.

### Step 3 — Review
User selects an end date or presses “Review now”.

System fills:

- latest known price or selected end price
- absolute move
- percentage move
- direction match / mismatch

### Step 4 — Explain outcome
User writes:

- what happened
- why it happened
- what invalidated the thesis
- whether the call was wrong, right, or mixed

### Step 5 — Learn
User can later filter and inspect:

- all wrong bearish calls
- all earnings ideas
- all cases with high confidence but bad outcomes
- all ideas where thesis was right but timing was wrong

---

## 8. Recommended Main Screen Layout

Route: `/shadow`

### Top row — Review KPIs
Compact cards, not noisy finance dashboard nonsense.

Show:

- Open Cases
- Reviewed Cases
- Accuracy Rate
- Avg Move vs Thesis
- Biggest Miss
- Best Call

Optional:

- Confidence Accuracy
- Bearish Accuracy
- Bullish Accuracy

### Left panel — New Shadow Case
Fields:

- Symbol selector
- Platform optional
- Bucket optional
- Direction
- Start date/time
- Entry price
- Time horizon
- Confidence
- Thesis
- Tags

Primary button:

- `Start Tracking`

### Center panel — Open Cases
Table columns:

- Symbol
- Direction
- Started
- Entry
- Current
- Move %
- Horizon
- Status
- Quick actions

Actions:

- Review now
- Add note
- Close
- Archive

### Right panel — Notes / Catalysts / Recent Reviews
A narrow stream with compact cards:

- recent notes
- catalyst logs
- reviewed cases
- “why I was wrong” snippets

This right rail is useful because the feature is about analysis memory, not just numbers.

---

## 9. Most Useful Data to Show Per Open Case

For each open case, show:

- symbol
- thesis direction badge
- entry price
- current price
- move %
- days open
- horizon badge
- quick thesis preview
- review status

Useful extra badges:

- Earnings soon
- News hit
- High confidence
- Overdue review

---

## 10. Review Screen / Drawer

When user clicks a case, open a drawer or detail page.

Sections:

### A. Thesis
- original thesis
- original direction
- confidence
- horizon
- created timestamp

### B. Market Result
- entry price
- end/current price
- move absolute
- move %
- whether move matched thesis

### C. Why section
Structured inputs:

- `What actually happened?`
- `Why do I think it happened?`
- `What invalidated my thesis?`
- `What did I miss?`
- `What should I watch next time?`

### D. News / catalyst links
Even if manual in MVP.

### E. Notes timeline
Every added note in chronological order.

This part is the real product value.

---

## 11. Notes System

Notes should exist separately from the base case.

Types:

- thesis_note
- observation_note
- catalyst_note
- review_note
- lesson_note

Each note:

- belongs to one shadow case
- has timestamp
- has text body
- optional tag
- optional pinned flag

This lets the user log things like:

- “Volume looks weak; conviction reduced.”
- “Unexpected guidance raise.”
- “Sector sympathy move, not company-specific.”
- “Thesis wrong, timing not the only problem.”

---

## 12. Outcome Logic

Outcome should not be only binary.

Use:

- `correct`
- `wrong`
- `mixed`
- `invalidated`
- `unreviewed`

Examples:

- bullish case, price up meaningfully → `correct`
- bearish case, price rallies hard → `wrong`
- thesis broadly right but timing bad → `mixed`
- company had unexpected news that broke premise → `invalidated`

This matters because markets are messy and a stupid yes/no system will lie.

---

## 13. Filters That Actually Matter

Top useful filters:

- symbol
- direction
- outcome
- platform
- bucket
- tag
- horizon
- confidence range
- started date range
- reviewed date range

Smart saved views later:

- Wrong high-confidence calls
- Earnings plays
- Bearish ideas
- Missed reversals
- Good thesis, bad timing
- Cases without review
- Overdue open cases

---

## 14. Suggested DB Tables

## 14.1 shadow_cases

Fields:

- `id`
- `user_id`
- `platform_id`
- `bucket`
- `symbol`
- `direction`
- `thesis`
- `confidence`
- `time_horizon`
- `started_at`
- `entry_price`
- `status`
- `ended_at`
- `exit_price`
- `price_change_abs`
- `price_change_pct`
- `outcome`
- `result_summary`
- `archived_at`
- `created_at`
- `updated_at`

## 14.2 shadow_snapshots

One case may later have start/end snapshots if needed.

Fields:

- `id`
- `shadow_case_id`
- `snapshot_type` (`start`, `end`, `manual`)
- `captured_at`
- `price`
- `day_change_pct` nullable
- `market_meta_json` nullable
- `news_meta_json` nullable
- `raw_context_json` nullable
- `created_at`

## 14.3 shadow_notes

Fields:

- `id`
- `shadow_case_id`
- `note_type`
- `title` nullable
- `body`
- `is_pinned`
- `created_at`
- `updated_at`

## 14.4 shadow_tags

Fields:

- `id`
- `user_id`
- `name`
- `color` nullable
- `created_at`

## 14.5 shadow_case_tags

Fields:

- `shadow_case_id`
- `shadow_tag_id`

## 14.6 shadow_events
Optional but good if you want auditability.

Fields:

- `id`
- `shadow_case_id`
- `event_type`
- `payload_json`
- `created_at`

Examples:

- case_created
- thesis_updated
- note_added
- case_reviewed
- case_closed
- outcome_changed

---

## 15. UX Copy Suggestions

Buttons:

- `Start Tracking`
- `Review Case`
- `Review Now`
- `Close Case`
- `Add Note`
- `Mark as Mixed`
- `Archive`

Labels:

- `Expected Move`
- `Why I Took This`
- `What Happened`
- `Why I Was Wrong`
- `Lesson`
- `Confidence`
- `Time Horizon`

---

## 16. MVP Scope

### In scope
- separate `/shadow` route
- create case
- open cases list
- review flow
- notes
- filters
- outcome tracking
- separate shadow tables
- basic KPI cards

### Out of scope for MVP
- realistic paper brokerage
- partial fills
- order types
- stop losses
- portfolio allocation simulation
- options
- leverage
- advanced charting
- auto-ingested news explanations
- broker sync

That stuff can come later, but it is not the actual core value.

---

## 17. Future Useful Additions

Only after MVP is stable:

### A. Scenario type
- breakout chase
- fade
- earnings reaction
- value entry
- catch falling knife
- macro bet

### B. Auto review prompts
Show guided prompts after N days:
- “Did the thesis play out?”
- “Was the move driven by news or market beta?”
- “Was timing the issue?”

### C. Thesis scorecard
Break wrong calls into buckets:
- wrong direction
- wrong timing
- missed catalyst
- held bias too long
- ignored valuation
- ignored momentum

### D. Compare with real trades
Later, maybe link a shadow case to a real trade idea, but never in MVP storage logic.

### E. Pre/post event templates
For earnings plays or macro events.

---

## 18. Opinionated Recommendation

For your use case, Shadow Trading should be built as:

- **Idea Tracker first**
- **Review Journal second**
- **Fake trading simulator only later if needed**

Because the real pain is not “how many fake shares did I buy?”
The real pain is:
- bad thesis
- weak memory
- hindsight bias
- no structured review
- repeating the same mistakes

So yes:
- separate route
- separate tables
- case-based model
- review-oriented UI

That is the right direction.

---

## 19. First Screen Example

Single screen structure:

### Header
- title: `Shadow Trading`
- small subtitle: `Track ideas, review outcomes, learn from misses`

### Toolbar
- search
- filters
- button `New Case`

### KPI row
- Open Cases
- Accuracy
- Biggest Win
- Biggest Miss
- Awaiting Review

### Main content split
- left: new case form
- center: open / reviewed cases table with tabs
- right: notes and recent lessons

This is compact, stable, and actually useful.

---

## 20. Final Product Rule

Every shadow case should leave behind an answer to this:

> “What did I expect, what actually happened, and what did I learn?”

If the feature does not produce that, it is just another noisy watchlist.
