# shadow-theses-spec.md

## 1. Goal

Add a **Theses** feature to Shadow Trading.

A thesis is a **higher-level market narrative** that can connect multiple shadow cases under one durable idea.

Examples:

- AI infrastructure capex cycle
- Oil recovery after oversold panic
- Small-cap shipping rebound
- Rotation out of mega-cap tech
- Rate cut expectations lifting speculative names

Shadow cases are single tracked ideas.  
Theses are the broader reasoning layer above them.

The purpose is to stop Shadow Trading from becoming a pile of disconnected notes.

---

## 2. Product Role

Use Theses to answer:

- “What bigger idea was I trading around?”
- “Which shadow cases came from the same narrative?”
- “Is this thesis still alive, weakening, or broken?”
- “How many cases under this thesis actually worked?”
- “Do I keep repeating the same macro or sector belief without proof?”

Theses are not just notes.  
They are structured containers for conviction, updates, and linked cases.

---

## 3. Position in Product IA

Recommended route:

- `/shadow/theses`

Optional details route:

- `/shadow/theses/[id]`

Theses should be visually and logically part of the Shadow Trading area, not a separate product.

---

## 4. Core Concept

A thesis is a durable object with:

- title
- narrative
- status
- conviction
- timeframe
- linked symbols
- linked shadow cases
- update history
- invalidation conditions
- lessons

A thesis can exist before any case is created, or it can be created later after several shadow cases obviously belong together.

---

## 5. Key Use Cases

### A. Pre-thesis workflow
User creates a thesis first:
- “AI infra names will keep rerating for 6 months”
- then creates shadow cases under NVDA, AMD, ANET, TSM

### B. Post-hoc grouping
User already has multiple shadow cases and later groups them under one thesis:
- “These were all actually part of the same energy rebound idea”

### C. Thesis invalidation
User changes status from `live` to `invalidated` and records why:
- “Expected rate cuts did not arrive”
- “Demand thesis broke after guidance”

### D. Thesis review
User checks whether:
- linked cases were mostly correct
- conviction was justified
- timing was bad
- thesis was right but symbols were wrong

---

## 6. Main Entity

### Thesis

Fields:

- `id`
- `user_id`
- `title`
- `slug` nullable
- `status`
- `conviction`
- `time_horizon`
- `summary`
- `thesis_body`
- `why_now` nullable
- `invalidation_conditions` nullable
- `watch_signals` nullable
- `started_at` nullable
- `last_reviewed_at` nullable
- `archived_at` nullable
- `created_at`
- `updated_at`

### Recommended enums

#### status
- `draft`
- `live`
- `weakening`
- `stale`
- `invalidated`
- `archived`

#### conviction
Use either:
- integer 1–5
or
- 0–100

Keep it simple in MVP.

#### time_horizon
Examples:
- `days`
- `weeks`
- `1m`
- `3m`
- `6m`
- `1y`
- `multi_year`
- `custom`

---

## 7. Relationship to Shadow Cases

A thesis can link to many shadow cases.

A shadow case may optionally link to one thesis in MVP.

Recommended MVP relationship:

- one thesis -> many shadow cases
- one shadow case -> zero or one thesis

This avoids relationship mess early.

Later you can support:
- many-to-many
if one case fits multiple narratives

But for MVP, keep it simple.

---

## 8. Minimum Data Model

## 8.1 shadow_theses

Fields:

- `id`
- `user_id`
- `title`
- `status`
- `conviction`
- `time_horizon`
- `summary`
- `thesis_body`
- `why_now`
- `invalidation_conditions`
- `watch_signals`
- `started_at`
- `last_reviewed_at`
- `archived_at`
- `created_at`
- `updated_at`

## 8.2 shadow_thesis_symbols

Optional helper table if you want linked symbols even without cases.

Fields:

- `id`
- `shadow_thesis_id`
- `symbol`
- `created_at`

## 8.3 shadow_thesis_updates

Timeline of changes and evolving judgment.

Fields:

- `id`
- `shadow_thesis_id`
- `update_type`
- `title` nullable
- `body`
- `conviction_before` nullable
- `conviction_after` nullable
- `status_before` nullable
- `status_after` nullable
- `created_at`

Example `update_type` values:
- `new_evidence`
- `conviction_change`
- `status_change`
- `review`
- `lesson`
- `warning`

## 8.4 shadow_case_thesis_link
Only needed if you do not store thesis_id directly on `shadow_cases`.

Fields:

- `shadow_case_id`
- `shadow_thesis_id`

Simpler MVP alternative:
- add `thesis_id` nullable on `shadow_cases`

That is probably enough.

---

## 9. UI: Theses List Page

Route:
- `/shadow/theses`

Main page sections:

### Header
- title: `Theses`
- subtitle: `Track bigger narratives across multiple shadow cases`
- CTA: `New Thesis`

### Toolbar
- search
- status filter
- conviction filter
- horizon filter
- sort: updated / conviction / linked cases / accuracy

### Main table or cards
Columns:

- Title
- Status
- Conviction
- Horizon
- Linked Cases
- Symbols
- Last Updated
- Accuracy summary
- Actions

Accuracy summary can be simple:
- `3 / 5 correct`
or
- `60% case accuracy`

Do not overcomplicate it.

---

## 10. UI: Thesis Detail Page

Route:
- `/shadow/theses/[id]`

Recommended sections:

### A. Thesis Header
- title
- status badge
- conviction badge
- horizon
- created date
- last reviewed date

### B. Core Narrative
Fields rendered clearly:
- Summary
- Thesis Body
- Why Now
- Invalidation Conditions
- Watch Signals

### C. Linked Cases
Table of all shadow cases under this thesis:
- symbol
- direction
- started
- outcome
- move %
- status
- quick link

### D. Thesis Update Timeline
Chronological list of updates:
- conviction increased
- invalidation warning
- new data point
- lesson learned

### E. Learnings
A compact summary area:
- what worked
- what failed
- what to repeat
- what to stop doing

This page should feel like a serious working document, not a note app.

---

## 11. MVP Workflows

### Workflow 1 — Create thesis
User fills:
- title
- summary
- body
- status
- conviction
- horizon
- invalidation conditions

### Workflow 2 — Link cases
From thesis detail page:
- attach existing shadow cases
or
- create new shadow case pre-linked to thesis

### Workflow 3 — Update thesis
User adds update:
- conviction changed
- new evidence
- warning
- lesson

### Workflow 4 — Invalidate thesis
User marks thesis as invalidated and records reason.

### Workflow 5 — Review performance
User sees:
- how many linked cases worked
- which symbols underperformed
- whether thesis was early or just wrong

---

## 12. Useful Derived Metrics

Do not overdo it, but these are useful:

- linked cases count
- open cases count
- reviewed cases count
- accuracy %
- avg move by linked cases
- number of wrong high-confidence cases
- thesis age in days
- days since review

These can be computed on read.

---

## 13. Copy Suggestions

Buttons:
- `New Thesis`
- `Link Case`
- `Add Update`
- `Review Thesis`
- `Mark Invalidated`
- `Archive Thesis`

Labels:
- `Why Now`
- `Invalidation Conditions`
- `Watch Signals`
- `Conviction`
- `Narrative`
- `Lessons`

Statuses:
- Draft
- Live
- Weakening
- Stale
- Invalidated
- Archived

---

## 14. MVP Scope

### In scope
- thesis list page
- thesis detail page
- create / edit thesis
- link thesis to cases
- status + conviction
- update timeline
- basic metrics

### Out of scope
- collaborative thesis editing
- multi-user authorship
- many-to-many complex graphing
- auto-generated narrative summaries
- public sharing
- AI scoring

---

## 15. Opinionated Recommendation

Theses are worth adding because they solve a real problem:
your shadow cases will otherwise become fragmented and forgettable.

This feature gives you:
- durable thinking
- better review structure
- a way to test narratives, not just tickers
- a memory system for conviction changes

That makes Shadow Trading smarter, not just larger.
