# ADR 0004: Company values for the Player ⇄ Stock match come from SEC EDGAR (public float)

Status: Proposed (needs John's OK) · 2026-11-10

## Context
The Player ⇄ Stock card (spec §4.8) pairs players with real companies by relative value. We need a
free source of company values that we are clearly allowed to display.

## Options checked (2026-11-10)
| Option | Result |
|---|---|
| companiesmarketcap.com | Terms (updated 2023-11-10) allow reuse only for editorial purposes; other uses need explicit permission. Not used. |
| Financial Modeling Prep | Docs and terms returned HTTP 403 to our fetcher; could not verify. Not used. |
| Alpha Vantage | Needs a key; terms are a PDF we could not read; the overview endpoint may be premium. Not used. |
| Wikidata (P2226 market cap) | CC0, but values are stale (Apple's latest: 2025-05-01). Not used. |
| **SEC EDGAR XBRL API** | Free, no key, US government data. `dei:EntityPublicFloat` = market value of shares held by outside investors, reported in each 10-K. Tested: Apple $3,647B (as of 2026-03-27), Microsoft $3,600B (2025-12-31), NVIDIA $4,000B (2025-07-25), Amazon $2,118B (2025-06-30), Johnson & Johnson $367B (2025-06-29). |

The SEC "frames" endpoint (all companies at once) contains obvious filing errors (small firms
reported in the trillions), so a raw top-N list is not trustworthy.

## Decision
- Use `GET https://data.sec.gov/api/xbrl/companyconcept/CIK##########/dei/EntityPublicFloat.json`
  for a curated, checked-in list of ~40 well-known US-listed companies (CIK, ticker, display name).
- The daily job refreshes them at most once a day (values change yearly) with a sanity check
  (new value within ×10 of the previous one, otherwise keep the old value and log it).
- The card labels the figure honestly: "Public float: the market value of shares held by outside
  investors, as reported to the SEC (as of <date>)". A Learn note explains how it differs from
  market capitalisation. Dates differ per company (fiscal years) and each is shown.
- SEC's fair-access policy asks automated clients to send a User-Agent that identifies the
  requester. That is a contact detail, so FSX reads it from env var `SEC_USER_AGENT`, which John
  sets himself. Without it, the card uses a checked-in seed file of the last fetched values.

## Consequences
Values lag up to ~16 months, which is fine for ranking-based teaching and is disclosed.
Non-US companies (e.g. SAP, ASML) are excluded because they do not file 10-Ks.
