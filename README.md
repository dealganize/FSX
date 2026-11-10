# FSX · Fantasy Stock Exchange

**Learn how the stock market works, using NFL fantasy football players you already know.**

FSX is an education-first web app that looks and behaves like a simple trading app. Every NFL player is a
pretend stock: his dynasty trade value is the price, Sleeper adds and drops are the volume, and a real Sleeper
roster becomes a portfolio. Every idea is explained twice: *in the stock market…* and *in fantasy football…*,
with a live example from today's data.

> Educational demo. Not a broker. No real money, no betting, no financial advice. Practice trades use pretend
> credits stored only in your browser.

**Live demo:** _not deployed yet_ (see [Deploy](#deploy-vercel--neon)) · **Built by** John Rogers
([github.com/dealganize](https://github.com/dealganize)) with an AI coding agent, see
[How this was built](#how-this-was-built).

![Learning path](docs/screenshots/learn-home.png)

| | |
|---|---|
| ![Markets](docs/screenshots/markets.png) | ![Player page with a practice trade and feedback](docs/screenshots/player.png) |
| ![A real Sleeper roster as a portfolio](docs/screenshots/sleeper-portfolio.png) | ![Lesson](docs/screenshots/lesson.png) |
| ![Dark theme](docs/screenshots/player-dark.png) | ![Mobile](docs/screenshots/mobile-markets.png) |

## What it teaches

The first release has five lessons. Each has a stated learning outcome, a hands-on task on a real screen and a
three-question check (a lesson counts as learned at 2 of 3).

| Lesson | After it, a beginner can… |
|---|---|
| 1. What is a price? | explain what a share price is and why it changes |
| 2. Up or down: reading change | read a +/− change and say why the percentage matters more than the raw number |
| 3. Volume | explain volume and why a big move on high volume means more |
| 4. Volatility and risk | explain volatility and name a news event (an injury) that moves a price |
| 5. Diversification | explain why concentrating in one sector (position) is risky |

Four more are specified in [`docs/spec.md`](docs/spec.md) (charts and trends, order types, portfolio gain/loss,
buying high and selling low).

## Features

- **Onboarding**: five short cards, one idea each, ending with the Player ⇄ Stock card.
- **Learning path** with progress, lessons, quizzes with instant explanations, and a glossary of 28 terms.
- **Learn mode** (on by default): dotted-underline terms open a plain / stock market / fantasy football
  explanation; "Why this matters" notes sit next to the numbers.
- **Markets**: ~400 players with price, 1-day or 30-day change, sparkline, volume; filter, search, sort; movers.
  Dynasty by default, redraft as a toggle.
- **Player page**: price chart from stored daily snapshots, key numbers, injury status, a volatility read-out,
  and a **practice trade** panel. After each trade, feedback explains what happened in market terms
  ("you bought after a big rise: that's buying high", "your portfolio is concentrated").
- **Player ⇄ Stock match**: pairs a player with a real US-listed company at the same value percentile, using
  the company's SEC-reported public float, plus a "style" label (growth, blue chip, high risk, steady).
- **Portfolios**: your practice portfolio (cost basis, unrealised and realised gain, diversification donut),
  and any Sleeper user's real roster valued as holdings (demo user `johnrog`).
- **Activity**: your practice trades, and real trades, waivers and free-agent moves from a Sleeper league shown
  as order history, valued at today's prices.
- **"Explain this" AI tutor** on every page: answers with tools over FSX's own data, then asks one
  check-for-understanding question. Declines real investment advice.
- Responsive, keyboard accessible, light and dark themes, automated WCAG 2.2 AA checks (axe) in CI.

## Architecture

```mermaid
flowchart LR
  subgraph Sources
    S[Sleeper public API]
    F[FantasyCalc values/current]
    E[SEC EDGAR XBRL]
  end
  subgraph Daily job ["Daily job (Vercel Cron → /api/cron/snapshot)"]
    Z[Zod validation] --> U[Upsert snapshots]
  end
  S --> Z
  F --> Z
  E --> Z
  U --> DB[(PostgreSQL via Drizzle<br/>Neon in prod · Docker or PGlite locally)]
  DB --> RSC["Next.js 16 Server Components<br/>'use cache' + cacheTag('market')"]
  S -- "per-user rosters & transactions<br/>(cached 15 min, never stored)" --> RSC
  RSC --> UI[Pages: Learn · Markets · Player · Portfolio · Activity · Glossary]
  UI -- localStorage --> L[Progress, quizzes,<br/>practice portfolio]
  UI --> T["/api/tutor (streaming NDJSON)"]
  T --> C[Claude Haiku 5.5<br/>tool loop] --> Tools[8 read-only tools over FSX data] --> DB
```

- `src/lib/sources/`: API clients; every response is validated with Zod and bad rows are counted, not trusted.
- `src/lib/jobs/snapshot.ts`: the daily job (players at most once per 24h, values for dynasty and redraft,
  trending, company values), idempotent per day, logged to `ingest_runs`.
- `src/lib/domain/`: pure, unit-tested logic: changes, volatility, diversification, the Player ⇄ Stock
  match, paper trading and its feedback, order history.
- `src/lib/repo/`: queries, cached with Next.js Cache Components. Pages call `connection()` before reading the
  database, so `next build` needs no database.
- `src/lib/tutor/`: system prompt, tools and a manual tool-use loop on the official `@anthropic-ai/sdk`.
- Multi-sport data model (`sport` column and a `MarketSources` interface) so a Fantasy Premier League mode
  can be added without schema changes. Only NFL exists today.

Decisions and their reasons are in [`docs/decisions/`](docs/decisions) (ADRs).

## Data sources and credits

| Source | Used for | How |
|---|---|---|
| [FantasyCalc](https://fantasycalc.com) | Player values (the "price") | `GET /values/current` once a day, as allowed by its [terms of use](https://fantasycalc.com/terms-of-usage) (free under 1,000 monthly active users, attribution next to the data, cached). FSX has no trade calculator. [ADR 0002](docs/decisions/0002-fantasycalc-values.md) |
| [Sleeper](https://docs.sleeper.com) | Players, injuries, trending adds/drops, leagues, rosters, transactions | Public read-only API, free for non-commercial use. `/players/nfl` at most once a day; per-user data cached briefly and never stored. [ADR 0001](docs/decisions/0001-sleeper-api.md) |
| [SEC EDGAR](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | Company public float for the Player ⇄ Stock card | `dei:EntityPublicFloat` for 54 hand-picked companies; each value shows its report date. [ADR 0004](docs/decisions/0004-company-values-sec-edgar.md) |
| KeepTradeCut | Not used | Its terms prohibit automated collection and reuse on other sites. John could ask them for permission. [ADR 0003](docs/decisions/0003-keeptradecut-excluded.md) |

FSX is not affiliated with or endorsed by FantasyCalc, Sleeper, KeepTradeCut or the SEC.

**Price history is never invented.** It grows by one stored snapshot per day. On the first day only, one
extra point per player is derived from FantasyCalc's 30-day trend (value − 30-day change) and drawn as a
dashed line. Volatility is shown only once 7 real daily snapshots exist.

## Run it locally

Requirements: Node.js 22+, npm. Docker is optional.

```bash
git clone https://github.com/dealganize/FSX.git
cd FSX
npm install
cp .env.example .env
npm run snapshot      # load today's live NFL data (Sleeper + FantasyCalc)
npm run dev           # http://localhost:3000
```

With an empty `DATABASE_URL`, FSX uses **PGlite** (Postgres compiled to WebAssembly) in `./.data/pglite`, so no
database server is needed. Stop `npm run dev` before running `npm run snapshot` again (one process per PGlite
folder).

To use **Postgres in Docker** instead:

```bash
docker compose up -d
# in .env: DATABASE_URL=postgres://fsx:fsx@localhost:5432/fsx
npm run snapshot
npm run dev
```

Offline: `npm run db:seed` loads the recorded fixtures instead of live data.

Optional settings in `.env`: `ANTHROPIC_API_KEY` turns on the tutor (without it the tutor says it is offline);
`SEC_USER_AGENT` lets the daily job refresh company values from the SEC (otherwise the checked-in values from
`src/data/company-values.seed.json` are used).

## Tests and CI

| | What | Command |
|---|---|---|
| Unit + integration | Domain logic, Zod parsing, the snapshot job and queries on an in-memory Postgres (PGlite) with recorded API fixtures, eval graders. No network. | `npm test` |
| End-to-end | Playwright on a production build with fixture data: learning flow, quizzes, markets, practice trade, portfolios, activity, Learn mode, theme, mobile menu, plus axe WCAG 2.2 AA checks on 6 pages in light and dark | `npm run build && npm run test:e2e` |
| Evals | Tutor quality (see below). Free dry run in CI; a small paid sample runs only if the `ANTHROPIC_API_KEY` secret is set | `npm run eval:dry` / `npm run eval` |

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint, typecheck, unit tests, the
eval dry run, the snapshot job against a real Postgres 17 service container, and the Playwright suite.

## AI tutor and evals

The tutor uses **Claude Haiku 5.5** (`claude-haiku-5-5`, low effort) through the official `@anthropic-ai/sdk`,
chosen as the cheapest model expected to hold quality ([ADR 0005](docs/decisions/0005-llm-model-choice.md)).
It has 8 read-only tools (player, price history, market movers, Sleeper portfolio, stock match, glossary,
lesson, search). The system prompt requires every number to come from a tool result, asks it to end with one
check-for-understanding question, and forbids investment advice. The API route validates input, rate-limits
per IP, caps tool iterations, and reports "offline" when no key is set.

[`evals/`](evals) has 21 hand-written cases:

| Check | How it is graded |
|---|---|
| Numbers match tool output | Code: every number in the answer must appear in a tool result or the question (rounding and "$3.65 trillion"-style scaling handled) |
| Expected tools called | Code |
| Concept accuracy and tutoring | LLM judge (Claude Sonnet 5.5) with a per-case rubric and structured output |
| Refuses investment advice | Code heuristic **and** LLM judge (5 cases, including a prompt-injection attempt) |

The graders are themselves tested on known-good and known-bad answers (`evals/graders.test.ts`). Infra errors
are recorded separately and never scored as failures. Each run records tokens, cost and full transcripts in
`evals/results/`.

**Results:** _not run yet._ Estimated cost of a full run: about $0.26 (`npm run eval -- --estimate`).

## Deploy (Vercel + Neon)

John creates the accounts; no credentials are stored in the repo.

1. **Neon**: sign up at neon.tech → *New project* (region: Frankfurt, `aws-eu-central-1`) → copy the
   *pooled* connection string (`postgres://…-pooler…/neondb?sslmode=require`).
2. Load data into Neon from your machine (PowerShell):
   ```powershell
   $env:DATABASE_URL="<Neon connection string>"; npm run snapshot
   ```
3. **Vercel**: sign up at vercel.com with GitHub → *Add New… → Project* → import
   `dealganize/FSX` → framework Next.js (auto-detected).
4. In *Settings → Environment Variables* add:
   - `DATABASE_URL` = the Neon pooled connection string
   - `CRON_SECRET` = a long random string (e.g. from a password manager)
   - `NEXT_PUBLIC_DEMO_SLEEPER_USER` = `johnrog`
   - optional `ANTHROPIC_API_KEY` (turns the tutor on; consider a spend limit in the Anthropic console)
   - optional `SEC_USER_AGENT` = `FSX demo <your contact email>`
5. Deploy. `vercel.json` schedules `/api/cron/snapshot` daily at 06:00 UTC; Vercel sends the `CRON_SECRET`
   automatically.
6. Put the deployment URL at the top of this README.

## How this was built

FSX was built by John Rogers working with an AI coding agent (Claude Code), using a spec-first, checkpointed
workflow. The artefacts are in the repo so the process can be inspected:

1. **Spec first.** [`docs/spec.md`](docs/spec.md) was written before any code and changed twice at John's
   direction: v2 made education the primary goal; v3 added the Player ⇄ Stock card, dynasty/redraft, Docker
   and a five-lesson first release. John approved it before the research started.
2. **Research spike with decision records.** The agent read each data source's docs, terms and robots.txt and
   wrote short ADRs ([`docs/decisions/`](docs/decisions)). That is how FantasyCalc's usage terms were found,
   KeepTradeCut was excluded, and four company-value sources were rejected in favour of SEC EDGAR. John
   approved the decisions before the build.
3. **Conventions for agents.** [`CLAUDE.md`](CLAUDE.md) holds the ground rules (no invented numbers, source
   rules, Next.js 16 patterns, workflow).
4. **Planned tasks, committed step by step.** Each step (data layer, domain logic, UI, tests, evals) was typechecked, linted and tested before committing
   (see `git log`). Real API responses were recorded once as fixtures, so tests never hit the network.
5. **Checks that caught real bugs.** The Playwright suite found a crash where an effect returned the Promise
   from `scrollIntoView()` in the current Chrome, and axe found colour-contrast failures, which led to a separate
   text colour for amber labels. The position colours were checked with a colour-blindness palette validator.
6. **Evals for the AI feature**, with graders tested on oracle and null answers, and a cost estimate and John's
   approval before any paid run.
7. **Human checkpoints.** John reviewed the spec, the data decisions and the plan for API spend, and reviews the
   diff before anything is pushed.

## Limitations

- Price history starts on the first snapshot day, so charts and volatility fill in over the first weeks.
- Company figures are public float, not market capitalisation, and can be over a year old; non-US companies
  that don't file 10-Ks are not included.
- The practice portfolio lives in one browser; clearing site data resets it.
- The tutor's rate limit is per server instance (best effort on serverless).
- FantasyCalc's free use is limited to fewer than 1,000 monthly active users.

## License

Code: MIT (see `LICENSE`). Data belongs to its sources and is used under their terms.
