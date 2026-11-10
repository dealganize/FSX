# ADR 0006: PostgreSQL + Drizzle; Docker locally, Neon in production; Vercel hosting

Status: Accepted · 2026-11-10

## Decision
- One `postgres:17-alpine` container in `docker-compose.yml` for local dev (kept light: no other services).
- Drizzle ORM with drizzle-kit migrations checked into the repo.
- Production: Neon (serverless Postgres, free tier) via `DATABASE_URL`; Vercel for the Next.js app;
  Vercel Cron calls the daily snapshot route, protected by `CRON_SECRET`.
- **Embedded fallback (added during the build):** when `DATABASE_URL` is empty, the same Drizzle schema
  runs on PGlite (Postgres compiled to WebAssembly) in `.data/pglite`. Reasons: Docker was not yet
  installed on the dev machine, and tests/e2e/evals get a real Postgres engine with zero setup
  (in-memory for Vitest and evals). Limitation: one process per PGlite data directory, so stop
  `npm run dev` before running `npm run snapshot` against it.
- Tests: unit and integration tests run on in-memory PGlite with recorded fixtures (no network).
  CI also runs the snapshot job against a real Postgres 17 service container. E2E uses PGlite seeded
  from fixtures.
- Pages call `connection()` before reading the database, so `next build` never needs a database.
- Learner state (onboarding, progress, quiz results, paper portfolio) lives in the browser's
  localStorage only; no visitor data is stored on the server.

## Note
Docker Desktop was not installed on John's machine on 2026-11-10; he is installing it. Until then the
app runs on PGlite.
