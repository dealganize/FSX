# Fantasy Stock Exchange — Product & Technical Spec

Status: **v3, approved by John with changes** (2026-11-10)
v2: education is the primary goal; the trading screens are the hands-on part of lessons.
v3: name FSX confirmed; dynasty default + redraft toggle; Docker for local Postgres;
first release ships 5 modules; new "Player ⇄ Stock" match on a starting page (§4.8).
Owner: John Rogers · Repo (planned): `github.com/dealganize/fantasy-stock-exchange`

## 1. Why this exists

**Primary goal: teach complete beginners how the stock market works.** The app simulates a
trading app, but every screen and flow exists to teach. It uses something many people
already understand, fantasy football: each NFL player is a "stock", his trade value is the
"price", and a real Sleeper roster is a "portfolio".

It is **educational only**: no real money, no betting, no deposits, no financial advice,
no real order execution. Paper trading uses fake cash and exists only to practise concepts.

Secondary goal: show, in working code, the stack and process that product-engineering
teams hire for (see §7 and §9).

## 2. Users

- **Beginner investor** who has never bought a share: needs plain language first and jargon
  second, one idea at a time.
- **Fantasy football player** who knows players but not markets: learns market terms by
  mapping them onto things they already do (trades, waivers, start/sit).
- **Hiring manager / interviewer**: opens the live demo, reads the README, skims the code.

## 3. Learning outcomes (the real success criteria)

After finishing the path, a beginner can, in their own words and using an example from the app:

| # | Module | Outcome: the learner can… |
|---|---|---|
| 1 | Price | explain what a share price is and why it changes (supply/demand, news) |
| 2 | Daily change & % | read a +/− change and say why % matters more than the absolute number |
| 3 | Volume | explain volume and why a big move on high volume means more |
| 4 | Charts & trends | read a price chart over 7/30/90 days and describe the trend |
| 5 | Volatility & risk | explain volatility and name a news event (injury) that moves a price |
| 6 | Orders | tell a market order from a limit order, and buy vs sell |
| 7 | Portfolio & gain/loss | explain portfolio value, cost basis, unrealised vs realised gain |
| 8 | Diversification | explain why concentration in one "sector" (position) is risky |
| 9 | Buy high / sell low & emotions | recognise chasing a spike and panic selling in their own paper trades |

**First release ships modules 1, 2, 3, 5 and 8** (price, change, volume, volatility,
diversification), matching the onboarding cards, so John can review the look and feel.
Modules 4, 6, 7 and 9 follow once the format is approved.

Each module ends with a 3-question check; a module counts as "learned" at ≥ 2/3 correct.
These outcomes are what the README reports, alongside the technical "done" list in §11.

## 4. Flow and screens

### 4.1 First run: onboarding (`/start`)
Five short cards, one concept each, ending on the Player ⇄ Stock card (§4.8) (price → change → volume → volatility → diversification).
Each card has the same three parts:
1. **Plain language** first ("A price is what someone will pay today.")
2. **"In the stock market…"** and **"In fantasy football…"** side by side
3. **Live example** from today's data ("Right now the most valuable RB is X at 8,412.")

Ends with "Start the learning path" or "Explore freely". Skippable; never shown again once
done (stored in the browser).

### 4.2 Learning path (`/learn`, the home screen after onboarding)
The nine modules from §3 as a path with progress (✓ done, current, locked-until-previous
suggested but not enforced). Each module = a short lesson (≤ 3 minutes of reading) →
a **hands-on task** that opens a real screen with a highlighted area
("Open the Markets page and find today's biggest gainer by %") → a quick check (3 questions,
instant feedback with an explanation for each answer).

### 4.3 Hands-on screens (the practice area)
| Screen | What it shows | Teaching layer on top |
|---|---|---|
| **Markets** (`/markets`) | NFL players: name, team, position, price (trade value), daily change (abs + %), 30-day sparkline, volume (Sleeper trending adds/drops, 24h). Search, filter by position, sort. Movers strip. | Every column header has a "?" tooltip and a "why this matters" note. |
| **Player** (`/player/[id]`) | Price chart from stored daily snapshots (7D/30D/90D/All), age, team, position, experience, injury status and news. | Annotations on the chart ("injury reported here"), a volatility meter explained in words. |
| **Trade (paper)** panel on Player page | Buy/sell with fake cash (start 100,000 FSX credits). Market order at today's price; limit order explained and simulated against the next daily snapshot. | **Feedback after every trade**, in market terms: "You bought after a +18% week — that's buying into a spike; prices often cool off after spikes." / "You sold a player who dropped 25% after an injury — that's selling low; ask whether the injury changes the long-term value." |
| **My paper portfolio** (`/portfolio`) | Paper holdings, cash, total value, cost basis, unrealised/realised gain, diversification by position (donut). | Plain-language summary: "62% of your money is in WRs — that's concentrated." |
| **Real roster as a portfolio** (`/portfolio/sleeper/johnrog`) | Sleeper user `johnrog`'s real roster(s) valued at today's prices; username input so any visitor can try their own. | Compares diversification with the paper portfolio. |
| **Activity** (`/activity`) | Real trades, waivers and free-agent moves from his leagues as order history, with each side's value today; plus the learner's own paper trades. | "Who won this trade?" explained as a gain/loss since the trade date. |

### 4.4 Teaching everywhere
- **Learn mode** (on by default for new users, toggle in the header): dotted-underline
  tooltips on every term and a "why this matters" note on every number.
- **Glossary** (`/glossary`): ~25 terms, each with plain language, stock-market meaning,
  fantasy-football meaning and a live example computed from current data.
- Jargon never appears without an explanation on first use on a page.

### 4.5 "Explain this" tutor
Chat drawer on every page, context-aware (knows which page and player you are on). Acts
as a **tutor first**: explains with data from tools, then asks one short follow-up question
to check understanding. It never gives real investment advice (see §6).

### 4.8 Player ⇄ Stock match ("If this player were a stock…")
On a starting page (the Learn home and the end of onboarding), a card pairs a current NFL
player with a real, well-known listed company **by relative value**: players ranked by
today's trade value are matched to companies ranked by market capitalisation, so the
No. 1 player sits next to the No. 1 company, a mid-ranked player next to a mid-ranked
company (percentile matching, so the list lengths can differ). The card shows both values
side by side, the rank/percentile, and a plain-language explanation ("Like X, Y is among
the most valuable in its market"). A shuffle button and a "pick a player" search let the
learner try others. Second line: a "style" label from the player's profile (young and
rising → growth stock; established star → blue chip; injured or falling → high risk),
each explained.

Rules: company figures come from a cited source with an "as of" date on the card; nothing
is invented. It is an analogy to teach market cap and ranking, never a view on whether the
company is a good investment. Data source decided in the research spike (ADR).

### 4.6 Common requirements
Responsive (phone → desktop), light and dark themes (system default + toggle), keyboard
accessible, WCAG 2.2 AA contrast, reduced-motion respected. Footer on every page:
"Educational demo. Not a broker. No real money. Not financial advice." Sources credited in
the footer and on `/about`.

### 4.7 State without accounts
No login. Onboarding status, module progress, quiz results and the paper portfolio live in
the browser (`localStorage`, validated with Zod on load, with a "reset my progress" button).
Nothing about a visitor is stored on the server.

## 5. Data

### 5.1 Sources (subject to the research spike, ADRs in `docs/decisions/`)

| Source | Used for | Status |
|---|---|---|
| Sleeper public API (`api.sleeper.app/v1`) | Player metadata, injuries, trending adds/drops, users, leagues, rosters, transactions | Documented, free, read-only, no key. Stay under 1000 calls/min; cache `/players/nfl` max once per day. |
| FantasyCalc | Player trade values (the "price"); **dynasty by default, redraft toggle** | No official docs. Use only if terms/robots allow; otherwise fall back (below). |
| Company market caps (source TBD) | Player ⇄ Stock match (§4.8) | Must be free and allowed to display; cited with an "as of" date. |
| KeepTradeCut | — | No public API. **Not used** unless its terms clearly allow it. README notes John can ask them for permission. |

Fallback if FantasyCalc cannot be used: a transparent, documented in-house value model
derived from Sleeper data, clearly labelled "FSX model value", so the app still works.

### 5.2 Model (Drizzle / PostgreSQL)
Multi-sport by design so Fantasy Premier League can be added later without schema changes
(FPL is **not** built now):
- `value_snapshots.format`: `dynasty` | `redraft` (dynasty is the default view)
- `sport` enum: `nfl` (later `fpl`)
- `players` (sport, external_id, name, team, position, age, status, injury fields, raw jsonb, updated_at)
- `value_snapshots` (sport, player_id, source, date, value, rank): unique per (player, source, date); the price history
- `trending_snapshots` (sport, player_id, date, adds, drops)
- `ingest_runs` (job, started_at, finished_at, status, counts, error): observability for the daily job
- Lesson content and glossary live in typed TypeScript/MDX files in the repo (versioned, reviewable), not in the DB.
- Sleeper users, leagues, rosters and transactions are fetched live and cached briefly; not stored.

A `SportProvider` interface (`listPlayers`, `getValues`, `getTrending`, `getPortfolio`,
`getActivity`) hides the sources behind each sport. Only `NflProvider` is implemented.

### 5.3 Daily job
`/api/cron/snapshot` (protected by `CRON_SECRET`), triggered daily by Vercel Cron; runnable
locally with `npm run snapshot`. Fetch players (if older than 24h) → values → trending →
upsert → `ingest_runs` row. All external JSON validated with Zod; invalid rows counted and
skipped. History starts on the first run; it is never invented. Until there is enough
history, charts say "History builds daily — N days so far", and lessons that need history
use the longest real history available.

## 6. Tutor (AI) and guardrails
- Server route streams answers via `@anthropic-ai/sdk` with tool use. Tools: `get_player`,
  `get_price_history`, `get_trending`, `get_market_movers`, `get_sleeper_portfolio`,
  `search_players`, `get_glossary_term`, `get_lesson`.
- Rules in the system prompt, checked by evals: every number comes from a tool result; if
  there is no data it says so; explains concepts, then asks one follow-up question; never
  recommends real securities or tells the user what to do with real money; fantasy moves are
  discussed only as examples of the concept.
- Limits: max tokens per answer, max tool iterations, per-IP rate limit; route shows a
  friendly "tutor offline" message when no API key is set.

### Evals (`evals/`)
~20 cases, each tagged: (1) numbers match tool output (code check), (2) expected tools
called (code check), (3) concept accuracy and tutoring quality (explains + asks a follow-up)
via LLM-judge rubric, (4) refuses investment advice. Report pass rate per category, tokens
in/out and estimated cost. CI runs a free dry mode (recorded responses) and only calls the
API when the secret is set. Budget about 6 EUR: I estimate cost and ask John before any full run.

## 7. Stack
TypeScript (strict) · Next.js App Router + React Server Components · Tailwind CSS + shadcn/ui
· Recharts · `next-themes` · PostgreSQL + Drizzle ORM (local Postgres in Docker; Neon in
production) · Zod · `@anthropic-ai/sdk` (model choice in an ADR, cheapest that passes evals)
· Vitest with recorded API fixtures (no network in tests) · Playwright e2e · GitHub Actions
(lint, typecheck, unit, e2e, eval dry run) · Vercel + Vercel Cron.

## 8. Non-goals (v1)
FPL mode, accounts/login, server-side storage of any visitor's data, real money of any kind,
notifications, KeepTradeCut data, native mobile apps.

## 9. Process (kept as real artefacts)
1. This spec, approved by John. 2. Research spike → short ADRs in `docs/decisions/`.
3. `CLAUDE.md` with conventions. 4. Small planned tasks, small commits; typecheck and tests
after each change. 5. Human review of diffs (John), CI on every push, evals for the tutor.
6. README: screenshots, live demo link, how to run, architecture, data sources and credits,
learning outcomes, eval results with failure modes found and fixes, and an honest
"How this was built" section.

## 10. Check-ins with John
After this spec · after the data research · before spending API credit · before pushing.

## 11. Technical "done"
- Runs locally on live NFL data.
- Onboarding, learning path with the first 5 modules, Player ⇄ Stock match and quizzes, Markets, Player + paper trading with
  feedback, paper and Sleeper portfolios (`johnrog`), Activity, Glossary, tutor all work.
- Lint, typecheck, unit and e2e tests pass locally and in CI; evals report a pass rate, tokens and cost.
- README complete and factual; pushed to John's repo; Vercel + Neon steps documented.

## 12. Decisions from John (2026-11-10)
1. Name: **Fantasy Stock Exchange (FSX)**.
2. Price: **dynasty** default, **redraft** toggle.
3. Local Postgres via **Docker** (John installs Docker Desktop), kept lightweight: one Postgres container in `docker-compose.yml`.
4. First release: **5 modules**.
5. New: Player ⇄ Stock match card on a starting page (§4.8).
