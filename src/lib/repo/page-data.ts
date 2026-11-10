/**
 * Page-level loaders. `connection()` defers database reads to request time, so `next build`
 * never needs a database; results are still cached for an hour by the "use cache" wrappers.
 */
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db/client";
import type { ValueFormat } from "@/lib/sources/fantasycalc";
import { cachedCompanies, cachedMarket, cachedPlayer } from "./cached";
import { loadActivity, loadSleeperPortfolio, type PortfolioResult } from "./sleeper-portfolio";
import { lookupPlayers } from "@/lib/tutor/data";

export function parseFormat(v: string | string[] | undefined): ValueFormat {
  return v === "redraft" ? "redraft" : "dynasty";
}

export async function loadMarket(format: ValueFormat) {
  await connection();
  return cachedMarket(format);
}

export async function loadPlayer(id: string) {
  await connection();
  return cachedPlayer(id);
}

export async function loadCompanies() {
  await connection();
  return cachedCompanies();
}

/** Sleeper data per user: cached ~15 minutes, never stored in the database. */
async function cachedPortfolio(username: string, leagueId: string | undefined): Promise<PortfolioResult> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  cacheTag("sleeper");
  const db = await getDb();
  const [d, r] = await Promise.all([cachedMarket("dynasty"), cachedMarket("redraft")]);
  return loadSleeperPortfolio(username.toLowerCase(), leagueId, { dynasty: d.rows, redraft: r.rows }, (ids) => lookupPlayers(db, ids));
}

export async function loadPortfolio(username: string, leagueId: string | undefined) {
  await connection();
  return cachedPortfolio(username, leagueId);
}

async function cachedActivity(username: string, leagueId: string | undefined) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  cacheTag("sleeper");
  const result = await cachedPortfolio(username, leagueId);
  if (!result.ok) return { portfolio: result, activity: null };
  const [d, r] = await Promise.all([cachedMarket("dynasty"), cachedMarket("redraft")]);
  const activity = await loadActivity(result.portfolio, { dynasty: d.rows, redraft: r.rows });
  const ids = "items" in activity ? [...new Set(activity.items.flatMap((i) => [...i.bought, ...i.sold].map((l) => l.playerId)))] : [];
  const names = Object.fromEntries(await lookupPlayers(await getDb(), ids));
  return { portfolio: result, activity, names };
}

export async function loadActivityPage(username: string, leagueId: string | undefined) {
  await connection();
  return cachedActivity(username, leagueId);
}
