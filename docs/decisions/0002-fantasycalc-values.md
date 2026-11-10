# ADR 0002: Use FantasyCalc `GET /values/current` as the "price", under its terms

Status: Accepted · 2026-11-10

## Context
The "share price" of a player is his trade value. FantasyCalc has no official API docs, so the
brief required checking its terms and robots.txt first.

## Findings (read 2026-11-10)
- Terms of Use at https://fantasycalc.com/terms-of-usage (effective 2026-10-10) explicitly grant
  other sites and apps permission to use its values, with conditions:
  - free for sites/apps with fewer than 1,000 monthly active users; above that, written permission is needed;
  - attribution ("FantasyCalc" or its logo) on every page that shows the data, near the data,
    linking to fantasycalc.com, with at least one link in the initial HTML without JavaScript;
  - responses must be cached and reused across users; each unique query refreshed at most every 3 hours;
  - only `GET /values/current` may be called programmatically; scraping is prohibited;
  - must not be used to build a substitute for its trade calculator or other key features;
  - no use on gambling-affiliated sites; no implied endorsement.
- robots.txt on www disallows only `/league/` paths (with two exceptions) and draft pages;
  the API host has no robots.txt.
- Response: JSON array; each item has `player { name, sleeperId, position, maybeTeam, maybeAge, … }`,
  `value`, `overallRank`, `positionRank`, `trend30Day`, `redraftValue`, and more.
  `isDynasty=true|false` switches dynasty / redraft. Draft picks appear with `position: "PICK"`.
- No historical endpoint was found; `trend30Day` is the only history-like field.

## Decision
- Price = FantasyCalc `value` for `isDynasty=true` (default) and `isDynasty=false` (redraft toggle),
  1QB, 12 teams, PPR. Joined to Sleeper via `sleeperId`. Picks are excluded from Markets.
- Fetched by the daily snapshot job only (once a day, well inside the 3-hour rule); pages read from
  Postgres, so the API is never called per visitor.
- A server-rendered "Values: FantasyCalc" link to https://fantasycalc.com sits next to every price
  table and chart, and in the footer.
- FSX has no trade calculator or trade analyser. "Who won this trade" on the Activity page shows
  today's values of a past, real trade to teach gain/loss; it does not evaluate proposed trades.
- Price history = our own daily snapshots. On the first run we also store one derived point,
  "value 30 days ago" = `value − trend30Day`, labelled as derived from FantasyCalc's 30-day trend.
  No other history is invented.
- README states the 1,000 MAU condition; if the demo grew past it, John would ask FantasyCalc.

## Consequences
Charts start thin (two points, then one per day). The Learn copy explains why.
