# ADR 0006: PostgreSQL + Drizzle; Docker locally, Neon in production; Vercel hosting

Status: Accepted · 2026-11-10

## Decision
- One `postgres:17-alpine` container in `docker-compose.yml` for local dev (kept light: no other services).
- Drizzle ORM with drizzle-kit migrations checked into the repo.
- Production: Neon (serverless Postgres, free tier) via `DATABASE_URL`; Vercel for the Next.js app;
  Vercel Cron calls the daily snapshot route, protected by `CRON_SECRET`.
- Tests: unit tests use recorded fixtures and pure functions (no DB, no network). CI runs a Postgres
  service container for integration and e2e tests.
- Learner state (onboarding, progress, quiz results, paper portfolio) lives in the browser's
  localStorage only; no visitor data is stored on the server.

## Note
Docker Desktop was not installed on John's machine on 2026-11-10; he is installing it.
