# shadow-calendar-spec.md

## 1. Goal

Add a **Catalyst Calendar** to Shadow Trading.

This is not a generic calendar page.
It is a focused calendar for **events that can move shadow cases** and for **review reminders**.

Purpose:

- track upcoming catalysts tied to open shadow cases
- see what event may explain a move
- review cases around key dates
- avoid missing earnings, macro prints, and invalidation moments

Recommended route:

- `/shadow/calendar`

---

## 2. Product Role

The calendar should answer:

- “What important event is coming up for my open cases?”
- “Why did this symbol move?”
- “Which open ideas need review soon?”
- “Did this catalyst help or kill the thesis?”
- “What cluster of events is hitting this week?”

This feature is about context and timing, not productivity scheduling.

---

## 3. Main Principle

Only include calendar items that matter to Shadow Trading.

Good calendar items:

- earnings
- CPI
- FOMC
- jobs report
- product launch
- investor day
- FDA decision
- lockup expiry
- ex-dividend if user cares
- guidance date
- thesis review reminder
- case review reminder
- manually added catalyst event

Bad calendar items:

- generic task management
- random personal reminders
- unrelated meetings
- full portfolio scheduler nonsense

---

## 4. Core Concepts

There are two useful event types:

### A. Market / Catalyst Event
An event that may affect one or more symbols or a thesis.

Examples:
- NVDA earnings
- CPI print
- OPEC meeting
- biotech FDA decision
- Tesla delivery report

### B. Review Event
An internal reminder to revisit:
- a shadow case
- a thesis
- an overdue open position idea

Examples:
- “Review TSLA bearish case after earnings”
- “Revisit AI capex thesis in 2 weeks”

---

## 5. Main Entities

## 5.1 shadow_calendar_events

Fields:

- `id`
- `user_id`
- `title`
- `event_type`
- `event_date`
- `event_time` nullable
- `timezone` nullable
- `status`
- `importance` nullable
- `symbol` nullable
- `thesis_id` nullable
- `shadow_case_id` nullable
- `source_type`
- `description` nullable
- `outcome_note` nullable
- `created_at`
- `updated_at`

### event_type
Suggested values:
- `earnings`
- `macro`
- `product_event`
- `guidance`
- `investor_day`
- `lockup`
- `fda`
- `news`
- `review_case`
- `review_thesis`
- `custom`

### status
- `upcoming`
- `done`
- `cancelled`
- `missed`

### importance
- `low`
- `medium`
- `high`
- `critical`

### source_type
- `manual`
- `imported`
- `derived_from_case`
- `derived_from_thesis`

For MVP, manual is enough.

---

## 6. Optional Linking Tables

If later one event can affect many symbols or many cases, you may need link tables.

But MVP can stay simple with nullable foreign keys:
- `symbol`
- `thesis_id`
- `shadow_case_id`

That is enough to start.

---

## 7. UI: Calendar Page

Route:
- `/shadow/calendar`

Page sections:

### Header
- title: `Catalyst Calendar`
- subtitle: `Track the events that may move your shadow cases`
- CTA: `Add Event`

### Toolbar
- view switch: Month / Week / Agenda
- filters:
  - event type
  - symbol
  - linked thesis
  - linked case
  - importance
  - upcoming / past

### Main content
Recommended default:
- agenda or week view first
because it is more useful than a giant empty month grid

Still support:
- month view for overview
- week view for density
- agenda view for usability

---

## 8. Calendar Item Design

Each item should be compact and informative.

Display:
- event title
- date/time
- symbol badge if relevant
- event type badge
- importance badge
- linked case or thesis badge
- small note preview

Examples:

- `NVDA Earnings`
- `CPI Print`
- `Review TSLA Bearish Case`
- `AI Capex Thesis Recheck`

Avoid noisy event cards.

---

## 9. Useful Sidebar / Secondary Panel

A right-side details rail or drawer is useful.

When clicking an event, show:

- full title
- date/time
- event type
- linked symbol / case / thesis
- why it matters
- note area
- quick links:
  - open linked case
  - open linked thesis
  - mark reviewed
  - add outcome note

This keeps the calendar practical.

---

## 10. Main MVP Workflows

### Workflow 1 — Add manual catalyst
User creates event:
- title
- date
- type
- symbol optional
- thesis optional
- case optional
- importance
- description

### Workflow 2 — Add review reminder from case
From shadow case screen:
- `Add review reminder`
This pre-fills:
- event type = `review_case`
- linked case id
- symbol
- suggested date

### Workflow 3 — Add thesis review reminder
From thesis page:
- `Review in 2 weeks`
This creates:
- event type = `review_thesis`

### Workflow 4 — Record what happened
After event passes, user adds:
- outcome note
- whether event supported or broke thesis

### Workflow 5 — Filter week cluster
User filters:
- only high importance
- only earnings
- only linked to open cases

That is where the page becomes useful.

---

## 11. Suggested Derived Features

Good derived labels:

- Overdue review
- Today
- This week
- High importance
- Linked to live thesis
- Linked to open case

Good computed sections:

- upcoming this week
- overdue reviews
- recently passed catalysts
- events without outcome note

These are more useful than calendar eye-candy.

---

## 12. Recommended UI States

### Month view
Simple grid with:
- small event pills
- count overflow
- click to expand day drawer

### Week view
Best practical view:
- grouped by date
- easy to scan
- useful for catalyst-heavy weeks

### Agenda view
Probably best MVP default:
- list by date
- more readable
- easier to filter
- easier to implement

---

## 13. Copy Suggestions

Buttons:
- `Add Event`
- `Add Review Reminder`
- `Mark Reviewed`
- `Add Outcome Note`
- `Open Linked Case`
- `Open Thesis`

Labels:
- `Catalyst Type`
- `Why It Matters`
- `Outcome Note`
- `Importance`
- `Linked Case`
- `Linked Thesis`

Badges:
- Earnings
- Macro
- Review
- Thesis
- High Importance
- Upcoming
- Overdue

---

## 14. MVP Scope

### In scope
- `/shadow/calendar`
- agenda / week / month views
- manual event creation
- link event to case or thesis
- review reminders
- outcome notes
- useful filters

### Out of scope
- automatic earnings feeds
- full macro data sync
- exchange calendars
- push notifications
- auto-generated event relevance scoring
- portfolio-wide corporate actions engine

Those can come later.

---

## 15. Data Quality Rules

Important rules:

- Event must still be creatable without symbol
- But review events should usually link to a case or thesis
- Event deletion must not delete the linked case or thesis
- Calendar bugs must not impact core shadow case storage
- Event notes are supplementary, not the source of truth for the thesis itself

---

## 16. Opinionated Recommendation

Do not build this as a generic calendar.

Build it as a **Catalyst + Review Calendar** only.

That keeps the feature aligned with Shadow Trading:
- event awareness
- timing review
- learning from catalysts
- catching invalidation sooner

That makes it useful instead of decorative.
