# ADR 0003: Do not use KeepTradeCut data

Status: Accepted · 2026-11-10

## Findings (read 2026-11-10)
- No public API.
- Terms and Conditions (https://keeptradecut.com/terms-and-conditions) prohibit automated data
  collection (scraping, bots, crawlers, data extraction) and using its data or content on any
  other website.
- robots.txt disallows the `/…-rankings/histories` paths.

## Decision
KeepTradeCut is not used in any form. The README says John could contact KeepTradeCut through the
contact page on its site to ask for permission if he wants a second value source later.
