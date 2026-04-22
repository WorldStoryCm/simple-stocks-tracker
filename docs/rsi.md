Main task:
Add RSI indicator support across the product in a smart, reusable way.

This should not look like random extra data dumped into the UI.
It should feel like a thoughtful system enhancement.

Product thinking:
RSI should be shown in multiple places, but each area should use it differently:

* Symbols: RSI is part of symbol context and scanning
* Positions: RSI helps understand if an active holding is overbought / oversold
* Shadow Trading: RSI becomes part of the frozen context and later review analysis

There should be a sense that the app uses:

* one RSI data service
* one sync pipeline
* local database storage / cache
* shared reusable UI patterns

Also add in the top header a small status text:

Last sync was

This should feel like a trustworthy data product.

Visual style:

* modern SaaS dashboard
* light theme
* white and soft gray surfaces
* subtle borders
* near-black text
* compact spacing
* realistic internal product UI
* serious finance / analytics feel
* no neon
* no crypto aesthetic
* no giant gradients
* no messy chart overload

What to design:

Create a realistic product dashboard or multi-panel app screen showing how RSI is integrated across the system.

1. Top global header

Add a compact sync/status area in the header.

Include:

* Last sync was Apr 21, 23:48
* small neutral sync icon
* maybe tiny states like:
    * Synced
    * Refreshing
    * Delayed

This should not dominate the UI.
It should feel like operational status metadata.

2. Symbols area

Show a symbols table or list where RSI is clearly useful.

Columns can include:

* Symbol
* Price
* Daily %
* RSI
* Trend
* Volume
* Watchlist status
* Actions

RSI column should visually communicate state:

* oversold
* neutral
* overbought

But do it subtly:

* small colored badge
* compact value with tiny state label
* no huge heatmap blocks

Example rows:

* NVDA — RSI 71 — Overbought
* AMD — RSI 58 — Neutral
* TSLA — RSI 34 — Near Oversold
* BORR — RSI 29 — Oversold
* RDW — RSI 63 — Neutral

Possible extra UI:

* filter chips like:
    * RSI < 30
    * RSI > 70
    * Neutral RSI
* maybe a small saved filter section

Important:
Symbols should feel like the main home of RSI.

3. Positions area

Show an active positions table where RSI is used for decision context.

Columns can include:

* Symbol
* Avg Entry
* Current Price
* P/L %
* RSI
* Risk / Status
* Notes

Examples:

* position is up but RSI is very high
* position is down but RSI is approaching oversold
* neutral RSI means no immediate signal

The design should imply:
RSI helps interpret an open position, but it is not the whole strategy.

Good small labels:

* Stretched
* Neutral
* Oversold Risk
* Momentum Strong

Keep it compact and useful.

4. Shadow Trading area

Show a Shadow Trading case detail or table where RSI is part of the recorded context.

Important concept:
In Shadow Trading, RSI is not just a live metric.
It should appear as part of:

* start snapshot
* optional end snapshot
* review analysis

Show examples like:

* Entry RSI: 74
* Current RSI: 61
* Thesis: expected breakout continuation
* Outcome: mixed
* Lesson: entered while already extended

Possible UI sections:

* frozen snapshot card
* review drawer
* case table with small RSI column
* notes panel mentioning RSI in lessons

This should visually communicate:
RSI is useful for post-analysis and pattern review.

5. Shared data architecture feeling

The UI should hint that RSI comes from a single shared system.

Show subtle product cues like:

* small “Indicators synced” label
* one data freshness timestamp
* reusable RSI badge style across modules
* same terminology in Symbols / Positions / Shadow

Do not show backend diagrams, but make the product feel coherent.

Design details to include:

Reusable RSI component ideas

Use one consistent visual pattern for RSI values across the product:

* numeric value
* tiny state label
* subtle color treatment

State examples:

* Oversold
* Near Oversold
* Neutral
* Near Overbought
* Overbought

Optional expanded symbol panel

If a symbol detail drawer is shown, include:

* RSI 14
* maybe RSI history mini-line
* updated timestamp
* source / sync metadata

But keep it compact.

Header sync detail

Make sure the top header visibly includes:

* Last sync was <date time>
* data freshness / sync trust
* not flashy, just practical

Product interpretation to communicate:
The design should suggest this product now has:

* one RSI service
* shared sync logic
* DB-backed cached indicator values
* reusable indicators in multiple modules
* trustworthy freshness info

It should not feel like:

* three separate hacks
* random numbers bolted onto tables
* a trader toy UI

Example UX ideas:
You may include some of these if they fit:

* a Symbols filter preset: RSI extremes
* a Positions quick flag: RSI high
* a Shadow case snapshot field: RSI at entry
* a review lesson tag: Entered overbought
* header text: Last sync was Apr 21, 23:48

Overall feeling:
A production-ready stock dashboard where RSI has been integrated coherently across:

* Symbols
* Positions
* Shadow Trading

with:

* one shared indicator system
* stored/cached data
* visible freshness status
* compact and professional UX