# FSX · Fantasy Stock Exchange

Learn how the stock market works, using NFL fantasy football players you already know.

Fantasy football and the stock market work in surprisingly similar ways, so I used one to teach the other. In FSX every NFL player is a pretend stock. His dynasty trade value is the price, Sleeper adds and drops are the volume, and a real Sleeper roster becomes a portfolio. Every idea is explained twice, *in the stock market…* and *in fantasy football…*, with a live example from today's data.

> Educational demo. Not a broker. No real money, no betting, no financial advice. Practice trades use pretend credits stored only in your browser.

Live demo: not deployed yet (see [Deploy](#deploy-vercel--neon)). I built it with an AI coding agent; [How I built it](#how-i-built-it) explains how that worked. My GitHub: [github.com/dealganize](https://github.com/dealganize).

![Learning path](docs/screenshots/learn-home.png)

| | |
|---|---|
| ![Markets](docs/screenshots/markets.png) | ![Player page with a practice trade and feedback](docs/screenshots/player.png) |
| ![A real Sleeper roster as a portfolio](docs/screenshots/sleeper-portfolio.png) | ![Lesson](docs/screenshots/lesson.png) |
| ![Dark theme](docs/screenshots/player-dark.png) | ![Mobile](docs/screenshots/mobile-markets.png) |

## What it teaches

There are five lessons so far. Each one has a learning outcome, a small task to do on a real screen, and a three-question check at the end (you've learned it if you get 2 of 3).

| Lesson | After it, a beginner can… |
|---|---|
| 1. What is a price? | explain what a share price is and why it changes |
| 2. Up or down: reading change | read a +/− change and say why the percentage matters more than the raw number |
| 3. Volume | explain volume and why a big move on high volume means more |
| 4. Volatility and risk | explain volatility and name a news event (an injury) that moves a price |
| 5. Diversification | explain why concentrating in one sector (position) is risky |

Four more are planned in [`docs/spec.md`](docs/spec.md): charts and trends, order types, portfolio gain/loss, and buying high and selling low.

## What's in it

- A short intro: five cards, one idea each, ending with the Player ⇄ Stock card.
- A learning path with progress, the lessons, quizzes that explain each answer, and a glossary of 28 terms.
- Learn mode, on by default. Terms with a dotted underline open a plain, stock-market and fantasy-football explanation, and "Why this matters" notes sit next to the numbers.
- Markets: about 400 players with price, 1-day or 30-day change, a sparkline and volume. You can filter, search and sort, and there's a movers strip. Dynasty values by default, redraft as a toggle.
- A page for each player with a price chart built from daily snapshots, the main numbers, injury status, a volatility read-out and a practice-trade panel. After every trade you get feedback in market terms, like "you bought after a big rise: that's buying high" or "your portfolio is concentrated".
- Initials avatars for players (tinted by position) and ticker badges for companies. Player photos, NFL marks and company logos belong to other people, so I don't use them.
- The Player ⇄ Stock card. It pairs a player with a real US-listed company at the same value percentile, using the company's public float as reported to the SEC, and gives him a style label (growth, blue chip, high risk or steady).
- Two portfolios: your practice portfolio (cost basis, unrealised and realised gain, a diversification donut) and any Sleeper user's real roster valued as holdings. The demo user is `johnrog`, which is me.
- Activity: your practice trades, plus real trades, waivers and free-agent pickups from a Sleeper league shown as order history and valued at today's prices.
- An "Explain this" AI tutor on every page. It answers using FSX's own data, then asks you one question to check you understood. It won't give real investment advice.
- It works on phones, with the keyboard, and in light or dark mode. CI runs automated WCAG 2.2 AA checks with axe.

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

- `src/lib/sources/` has the API clients. Every response goes through Zod, and bad rows are counted and skipped.
- `src/lib/jobs/snapshot.ts` is the daily job: players at most once every 24 hours, dynasty and redraft values, trending players and company values. Running it twice on the same day is safe, and each run is logged to `ingest_runs`.
- `src/lib/domain/` holds the plain logic, all unit-tested: price changes, volatility, diversification, the Player ⇄ Stock match, paper trading and its feedback, and order history.
- `src/lib/repo/` has the queries, cached with Next.js Cache Components. Pages call `connection()` before they touch the database, so `next build` works without one.
- `src/lib/tutor/` has the tutor's system prompt, its tools and a hand-written tool-use loop on the official `@anthropic-ai/sdk`.
- Every table has a `sport` column and the data sources sit behind a `MarketSources` interface, so a Fantasy Premier League mode could be added without schema changes. Only NFL exists today.

I wrote down each decision and the reason for it in [`docs/decisions/`](docs/decisions) (ADRs).

## Data sources and credits

| Source | Used for | How |
|---|---|---|
| [FantasyCalc](https://fantasycalc.com) | Player values (the "price") | `GET /values/current` once a day, as its [terms of use](https://fantasycalc.com/terms-of-usage) allow (free under 1,000 monthly active users, credited next to the data, cached). FSX has no trade calculator. [ADR 0002](docs/decisions/0002-fantasycalc-values.md) |
| [Sleeper](https://docs.sleeper.com) | Players, injuries, trending adds/drops, leagues, rosters, transactions | Public read-only API, free for non-commercial use. `/players/nfl` at most once a day; per-user data is cached briefly and never stored. [ADR 0001](docs/decisions/0001-sleeper-api.md) |
| [SEC EDGAR](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | Company public float for the Player ⇄ Stock card | `dei:EntityPublicFloat` for 54 companies I picked; each value shows its report date. [ADR 0004](docs/decisions/0004-company-values-sec-edgar.md) |
| KeepTradeCut | Not used | Its terms don't allow automated collection or reuse on other sites. I could ask them for permission. [ADR 0003](docs/decisions/0003-keeptradecut-excluded.md) |

FSX is not affiliated with or endorsed by FantasyCalc, Sleeper, KeepTradeCut or the SEC.

I never make up price history. It grows by one stored snapshot a day. On the first day only, each player gets one extra point worked out from FantasyCalc's 30-day trend (value − 30-day change), drawn as a dashed line. Volatility only appears once there are 7 real daily snapshots.

## Run it locally

You need Node.js 22+ and npm. Docker is optional.

```bash
git clone https://github.com/dealganize/FSX.git
cd FSX
npm install
cp .env.example .env
npm run snapshot      # load today's live NFL data (Sleeper + FantasyCalc)
npm run dev           # http://localhost:3000
```

If `DATABASE_URL` is empty, FSX uses PGlite (Postgres compiled to WebAssembly) in `./.data/pglite`, so you don't need a database server. Stop `npm run dev` before you run `npm run snapshot` again, because only one process can use a PGlite folder at a time.

To use Postgres in Docker instead:

```bash
docker compose up -d
# in .env: DATABASE_URL=postgres://fsx:fsx@localhost:5432/fsx
npm run snapshot
npm run dev
```

To work offline, `npm run db:seed` loads the recorded fixtures instead of live data.

Two optional settings in `.env`: `ANTHROPIC_API_KEY` turns the tutor on (without it, the tutor says it's offline), and `SEC_USER_AGENT` lets the daily job refresh company values from the SEC (without it, FSX uses the checked-in values in `src/data/company-values.seed.json`).

## Tests and CI

| | What | Command |
|---|---|---|
| Unit + integration | Domain logic, Zod parsing, the snapshot job and queries on an in-memory Postgres (PGlite) with recorded API fixtures, eval graders. No network. | `npm test` |
| End-to-end | Playwright on a production build with fixture data: learning flow, quizzes, markets, practice trade, portfolios, activity, Learn mode, theme, mobile menu, plus axe WCAG 2.2 AA checks on 6 pages in light and dark | `npm run build && npm run test:e2e` |
| Evals | Tutor quality (see below). Free dry run in CI; a small paid sample runs only if the `ANTHROPIC_API_KEY` secret is set | `npm run eval:dry` / `npm run eval` |

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint, typecheck, unit tests, the eval dry run, the snapshot job against a real Postgres 17 service container, and the Playwright suite.

## AI tutor and evals

The tutor runs on Claude Haiku 5.5 (`claude-haiku-5-5`, low effort) through the official `@anthropic-ai/sdk`. I picked it as the cheapest model I expected to be good enough ([ADR 0005](docs/decisions/0005-llm-model-choice.md)). It has 8 read-only tools: player, price history, market movers, Sleeper portfolio, stock match, glossary, lesson and search. Its system prompt says every number has to come from a tool result, every answer ends with one check-for-understanding question, and investment advice is off limits. The API route validates input, rate-limits per IP, caps the number of tool calls, and says "offline" when there's no key.

[`evals/`](evals) has 21 cases that I wrote by hand:

| Check | How it is graded |
|---|---|
| Numbers match tool output | Code: every number in a statement must appear in a tool result or the question (rounding and "$3.65 trillion"-style scaling handled). Exempt: counts up to 10, FSX's time windows (7/24/30/90), a year next to a year in the data, sentences labelled "imagine/suppose/for example", and quiz questions |
| Expected tools called | Code |
| Concept accuracy and tutoring | LLM judge (Claude Sonnet 5.5) with a per-case rubric and structured output |
| Refuses investment advice | Code heuristic and LLM judge (5 cases, including a prompt-injection attempt) |

I tested the graders too, on answers I knew were good and answers I knew were bad (`evals/graders.test.ts`). API and network errors are recorded separately and never count as failures. Each run saves tokens, cost and the full transcripts in `evals/results/`.

### Results

I did three full runs on 2026-11-10, with `claude-haiku-5-5` as the tutor and `claude-sonnet-5-5` as the judge, one attempt per case, on that day's fixture snapshot. The reports are in [`evals/results/`](evals/results).

| Run | Change before the run | Pass rate | Numbers | Tools | Judge | Refusals | Cost |
|---|---|---|---|---|---|---|---|
| 1 | (baseline) | 14/21 (67%) | 17/21 | 8/8 | 10/13 | 5/5 | $0.099 |
| 2 | Prompt and grader fixes 1 to 4 below | 14/21 (67%) | 16/21 | 8/8 | 11/13 | 5/5 | $0.112 |
| 3 | Fixes 5 and 6 below | **17/21 (81%)** | 18/21 | 8/8 | 12/13 | 5/5 | $0.112 |

The three runs cost $0.32 in total. Most of each run is the judge (about $0.10); the Haiku tutor costs about $0.015 for all 21 questions. With one attempt per case, a case or two can flip between runs by chance, so read these numbers as a rough guide. I also changed the grader between runs (fixes 2, 4 and 6), which means runs 1 and 3 weren't scored by exactly the same rules.

### What went wrong, and what I changed

| # | Failure mode | Example | Fix |
|---|---|---|---|
| 1 | Wrong concept: public float defined as a share count | "Public float is the number of shares investors can trade" | The stock-match tool now returns a one-line definition (a dollar value held by outside investors) |
| 2 | Judge marked true app facts as invented | Tutor said player pages show a 30-day % change (true) | Tutor and judge share the same description of FSX's screens (`APP_FACTS`) |
| 3 | Unlabelled made-up numbers that read like data | "a player valued at 300", "a 70% rise" | Prompt: illustrations must say "imagine", "suppose" or "for example" and stay in one sentence |
| 4 | Grader false positive on derived dates | "nothing for November 2025" when asked about "a year ago" | Grader accepts a year next to a year in the data (tested both ways) |
| 5 | Grader counted quiz questions as claims | "Riskier after a 70% rise or a 70% fall?" | Numbers in a question are not checked as claims; the judge still checks for invented facts |
| 6 | Guessing how outside services work | "Sleeper usernames are case-sensitive" | Prompt: don't guess about outside services; suggest checking the spelling |

Four cases still failed in run 3. I left them in the results instead of tuning the prompt until they passed:
- Two answers spread an example over several sentences. "Imagine one player worth 10…" was labelled, but the next sentence had more made-up numbers. Haiku only partly follows the one-sentence rule.
- One answer did its own maths: the tutor worked out "about 15% of the total" for one player. After run 3 I changed the portfolio tool to return each holding's share, so it doesn't have to calculate. I haven't measured that fix yet.
- One answer about an unknown Sleeper user repeated the case-sensitivity guess, even after fix 6.

What never happened in any run: an invented market figure about a real player, a missed tool, or investment advice. All 15 refusal checks passed (5 cases × 3 runs), including the prompt-injection one.

In ADR 0005 I set a bar of 85% overall and 100% on refusals for keeping Haiku. Refusals clear it; 81% overall doesn't yet. What's left are presentation slips, not wrong data or advice, so I'm keeping Haiku for now. The next step to settle it is a comparison run with Sonnet 5.5 as the tutor, which would cost about $0.90.

## Deploy (Vercel + Neon)

You'll need your own Vercel and Neon accounts. No credentials are stored in the repo.

1. Neon: either run `neon login` and `neon init --org-id <org> --region-id aws-eu-central-1 --project-name fantasy-stock-exchange` (creates the project, writes `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to `.env`, adds `neon.ts`), or sign up at neon.tech → *New project* (region: Frankfurt, `aws-eu-central-1`) → copy the *pooled* connection string (`postgres://…-pooler…/neondb?sslmode=require`).
2. Load data into Neon from your machine (PowerShell):
   ```powershell
   $env:DATABASE_URL="<Neon connection string>"; npm run snapshot
   ```
3. Vercel: sign up at vercel.com with GitHub → *Add New… → Project* → import `dealganize/FSX` → framework Next.js (auto-detected).
4. In *Settings → Environment Variables* add:
   - `DATABASE_URL` = the Neon pooled connection string
   - `CRON_SECRET` = a long random string (e.g. from a password manager)
   - `NEXT_PUBLIC_DEMO_SLEEPER_USER` = `johnrog`
   - optional `ANTHROPIC_API_KEY` (turns the tutor on; set a spend limit in the Anthropic console first)
   - optional `SEC_USER_AGENT` = `FSX demo <your contact email>`
5. Deploy. `vercel.json` schedules `/api/cron/snapshot` daily at 06:00 UTC, and Vercel sends the `CRON_SECRET` with it automatically.
6. Put the deployment URL at the top of this README.

## How I built it

I built FSX with Claude Code as my coding agent. I wrote the brief, made the product and data decisions, and approved each stage. The agent did the research and wrote most of the code. I kept the working documents in the repo so you can see how it went:

1. Spec first. I had [`docs/spec.md`](docs/spec.md) written before any code, and changed it twice. Version 2 made teaching the main goal. Version 3 added the Player ⇄ Stock card, dynasty and redraft values, Docker, and a first release of five lessons. I approved it before the research started.
2. Research with decision records. The agent read each data source's docs, terms and robots.txt and wrote short ADRs ([`docs/decisions/`](docs/decisions)). That's how I found FantasyCalc's usage terms, decided to leave out KeepTradeCut, and picked SEC EDGAR over four other sources of company values. I approved those decisions before the build.
3. Ground rules for the agent. [`CLAUDE.md`](CLAUDE.md) sets them out: no invented numbers, the rules for each data source, Next.js 16 patterns, and the workflow.
4. Small steps. Each piece (data layer, domain logic, UI, tests, evals) was typechecked, linted and tested before it was committed (see `git log`). I recorded real API responses once as fixtures, so the tests never call the network.
5. Tests that caught real bugs. Playwright found a crash where an effect returned the Promise from `scrollIntoView()` in the current Chrome. Axe found colour-contrast failures, so amber labels now have their own darker text colour. I also ran the position colours through a colour-blindness palette checker.
6. Evals for the AI part. The graders are tested on known-good and known-bad answers, and every paid run had a cost estimate and my OK first.
7. Checkpoints. I signed off the spec, the data decisions and every paid eval run, and nothing was pushed to GitHub without my OK.

## Limitations

- Price history starts on the first snapshot day, so charts and volatility fill in over the first few weeks.
- Company figures are public float, not market capitalisation, and some are over a year old. Non-US companies that don't file 10-Ks aren't included.
- The practice portfolio lives in one browser; clearing site data resets it.
- The tutor's rate limit is per server instance, so on serverless it's best effort.
- FantasyCalc's free use only covers sites with fewer than 1,000 monthly active users.

## License

Code: MIT (see `LICENSE`). The data belongs to its sources and is used under their terms.
