# ADR 0001: Use the Sleeper public API for players, trending, rosters and transactions

Status: Accepted · 2026-11-10

## Context
FSX needs NFL player metadata, injuries, "volume" (trending adds/drops) and a real user's
leagues, rosters and transactions (`johnrog`).

## Findings (https://docs.sleeper.com, read 2026-11-10)
- Read-only HTTP API, no key. The docs say it is free to use for non-commercial purposes;
  commercial use needs a licence from Sleeper.
- Rate limit guidance: stay under 1000 calls per minute or risk an IP block.
- `/players/nfl` (~5 MB) is meant to be called at most once per day and stored on your own server.
- Attribution to Sleeper is requested when using trending data.
- Endpoints used: `/user/<name>`, `/user/<id>/leagues/nfl/<season>`, `/league/<id>/rosters`,
  `/league/<id>/users`, `/league/<id>/transactions/<week>`,
  `/players/nfl/trending/{add|drop}?lookback_hours=24&limit=N`, `/players/nfl`, `/state/nfl`.
- The player object has `first_name`/`last_name` (no `full_name`), `injury_status`,
  `injury_start_date`, `years_exp`, `search_rank`, `depth_chart_order`, `age`, `team`, `position`.
  Injury body part and notes are not documented, so the UI shows only what is present.

## Decision
- Use Sleeper for all of the above. FSX is non-commercial (portfolio project, no ads, no fees).
- `/players/nfl` is fetched by the daily job only and stored in Postgres.
- User, league, roster and transaction calls are made on demand with a short cache (15 min)
  and are never stored.
- One shared HTTP client with Zod validation, a timeout and a concurrency cap far below the limit.
- "Trending data from Sleeper" credit appears next to volume figures and in the footer.

## Consequences
If FSX ever became commercial, a Sleeper licence would be needed (noted in the README).
