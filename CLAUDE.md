# CLAUDE.md: conventions for agents working in this repo

FSX (Fantasy Stock Exchange) is an **education-first** app: it teaches the stock market with NFL
fantasy players as pretend stocks. Read `docs/spec.md` before changing behaviour and the ADRs in
`docs/decisions/` before touching data sources. Also read `AGENTS.md` (Next.js 16 notes: this is not
the Next.js in your training data; the docs are in `node_modules/next/dist/docs/`).

## Ground rules
- **Never invent numbers.** Prices, changes, counts and company values come from stored data or a
  source API. If data is missing, the UI says so. The only derived value is the one 30-day start
  point described in ADR 0002, and it is labelled.
- **Not financial advice.** No real money, no betting, no buy/sell recommendations about real assets.
  Keep the footer disclaimer and the tutor guardrails.
- **Data source rules** (ADRs 0001 to 0004): Sleeper `/players/nfl` at most once a day; FantasyCalc
  only `GET /values/current`, cached, refreshed at most every 3 hours (we do daily), credited with a
  server-rendered link next to every value; no KeepTradeCut; SEC requests need `SEC_USER_AGENT`.
- **Teach both ways.** New terms get a glossary entry with plain / stock market / fantasy football text.
- Secrets only from environment variables. Never commit `.env`.

## Stack and layout
- Next.js 16 App Router, React Server Components, **Cache Components** (`"use cache"`, `cacheLife`,
  `cacheTag`). Pages read data through `src/lib/repo/page-data.ts`, which calls `connection()` first so
  `next build` never needs a database.
- Request-time hooks (`usePathname`, `useSearchParams`) in shared layout components must sit inside
  `<Suspense>`.
- UI: Tailwind CSS v4 + shadcn/ui (Base UI primitives, `render` prop instead of `asChild`). Use
  `ButtonLink` for link-buttons. Colours are tokens in `src/app/globals.css`; position colours were
  validated for colour-blind separation and contrast in light and dark.
- Data: Drizzle ORM. `DATABASE_URL` set → Postgres (Docker locally, Neon in production); empty → PGlite
  in `.data/pglite`. Schema in `src/lib/db/schema.ts`; change it, then `npm run db:generate`.
- Pure logic lives in `src/lib/domain/` and must stay framework-free and unit tested.
- External JSON is validated with Zod in `src/lib/sources/`; bad rows are counted and skipped.
- Tutor: `src/lib/tutor/` (manual tool loop over the Messages API, `@anthropic-ai/sdk`). Tools only read
  FSX data. Model in ADR 0005 (`claude-haiku-5-5`, configurable with `FSX_TUTOR_MODEL`).

## Workflow
1. Small task, small commit (Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`).
2. After each change: `npm run typecheck && npm run lint && npm test`.
3. UI changes: `npm run build && npm run test:e2e` (Playwright on fixture data, includes axe checks).
4. Tutor changes: `npm run eval:dry` (free). A paid `npm run eval` needs the owner's OK first:
   print the estimate with `npm run eval -- --estimate`.
5. New data source or a change in how one is used: write an ADR first.

## Commands
| | |
|---|---|
| `npm run dev` | dev server on :3000 |
| `npm run snapshot` | daily job against live APIs |
| `npm run db:seed` | load recorded fixtures (offline) |
| `npm run fixtures:record` | re-record fixtures (rarely; respects rate limits) |
| `npm test` / `npm run test:e2e` | Vitest / Playwright |
| `npm run eval:dry` / `npm run eval` | free eval checks / paid eval run |
