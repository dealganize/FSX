/**
 * Read-side queries. Plain async functions (usable from scripts, tests and the tutor);
 * pages use the cached wrappers in ./cached.ts.
 */
import { and, desc, eq, gte, inArray, max, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { companyValues, ingestRuns, players, trendingSnapshots, valueSnapshots } from "../db/schema";
import type { ValueFormat } from "../sources/fantasycalc";
import { addDays } from "../jobs/snapshot";
import { changeOver, dailyChange, trendChange, volatility, type Change, type PricePoint } from "../domain/market";

export interface MarketRow {
  id: string;
  name: string;
  position: string | null;
  team: string | null;
  age: number | null;
  yearsExp: number | null;
  injuryStatus: string | null;
  value: number;
  rank: number;
  positionRank: number | null;
  change1d: Change | null;
  /** 30-day % change: from our own history once it covers 30 days, else FantasyCalc's trend. */
  change30Pct: number | null;
  change30Abs: number | null;
  change30Source: "history" | "fantasycalc-trend" | null;
  spark: number[];
  adds: number;
  drops: number;
}

export interface MarketData {
  format: ValueFormat;
  asOf: string | null;
  trendingDate: string | null;
  historyDays: number;
  rows: MarketRow[];
}

export async function latestValueDate(db: Db, format: ValueFormat): Promise<string | null> {
  const [r] = await db
    .select({ d: max(valueSnapshots.date) })
    .from(valueSnapshots)
    .where(and(eq(valueSnapshots.format, format), eq(valueSnapshots.derived, false)));
  return r?.d ?? null;
}

async function historyDays(db: Db, format: ValueFormat): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(distinct ${valueSnapshots.date})::int` })
    .from(valueSnapshots)
    .where(and(eq(valueSnapshots.format, format), eq(valueSnapshots.derived, false)));
  return r?.n ?? 0;
}

function toSeries(rows: { date: string; value: number; derived: boolean }[]): PricePoint[] {
  return rows
    .map((r) => ({ date: r.date, value: r.value, derived: r.derived }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function change30(series: PricePoint[], latestTrend: number | null): Pick<MarketRow, "change30Pct" | "change30Abs" | "change30Source"> {
  const real = series.filter((p) => !p.derived);
  const first = real[0];
  const last = real[real.length - 1];
  if (first && last && addDays(first.date, 30) <= last.date) {
    const c = changeOver(real, 30);
    if (c) return { change30Pct: c.pct, change30Abs: c.abs, change30Source: "history" };
  }
  const t = last ? trendChange(last.value, latestTrend) : null;
  return t ? { change30Pct: t.pct, change30Abs: t.abs, change30Source: "fantasycalc-trend" } : { change30Pct: null, change30Abs: null, change30Source: null };
}

export async function getMarket(db: Db, format: ValueFormat = "dynasty"): Promise<MarketData> {
  const asOf = await latestValueDate(db, format);
  if (!asOf) return { format, asOf: null, trendingDate: null, historyDays: 0, rows: [] };

  const snaps = await db
    .select({
      playerId: valueSnapshots.playerId,
      date: valueSnapshots.date,
      value: valueSnapshots.value,
      derived: valueSnapshots.derived,
      overallRank: valueSnapshots.overallRank,
      positionRank: valueSnapshots.positionRank,
      trend30Day: valueSnapshots.trend30Day,
    })
    .from(valueSnapshots)
    .where(and(eq(valueSnapshots.format, format), gte(valueSnapshots.date, addDays(asOf, -95))));

  const byPlayer = new Map<string, typeof snaps>();
  for (const s of snaps) {
    const list = byPlayer.get(s.playerId) ?? [];
    list.push(s);
    byPlayer.set(s.playerId, list);
  }
  // Only players priced on the latest day are "listed" in the market.
  const listedIds = [...byPlayer].filter(([, l]) => l.some((s) => s.date === asOf && !s.derived)).map(([id]) => id);

  const [playerRows, trendDateRow] = await Promise.all([
    listedIds.length ? db.select().from(players).where(inArray(players.externalId, listedIds)) : [],
    db.select({ d: max(trendingSnapshots.date) }).from(trendingSnapshots),
  ]);
  const trendingDate = trendDateRow[0]?.d ?? null;
  const trending = trendingDate
    ? await db.select().from(trendingSnapshots).where(eq(trendingSnapshots.date, trendingDate))
    : [];
  const trendMap = new Map(trending.map((t) => [t.playerId, t]));
  const playerMap = new Map(playerRows.map((p) => [p.externalId, p]));

  const rows: MarketRow[] = [];
  for (const id of listedIds) {
    const p = playerMap.get(id);
    if (!p) continue;
    const list = byPlayer.get(id)!;
    const today = list.find((s) => s.date === asOf && !s.derived)!;
    const series = toSeries(list);
    const tr = trendMap.get(id);
    rows.push({
      id,
      name: p.name,
      position: p.position,
      team: p.team,
      age: p.age,
      yearsExp: p.yearsExp,
      injuryStatus: p.injuryStatus,
      value: today.value,
      rank: today.overallRank ?? 9999,
      positionRank: today.positionRank,
      change1d: dailyChange(series),
      ...change30(series, today.trend30Day),
      spark: series.slice(-31).map((s) => s.value),
      adds: tr?.adds ?? 0,
      drops: tr?.drops ?? 0,
    });
  }
  rows.sort((a, b) => b.value - a.value);
  rows.forEach((r, i) => (r.rank = i + 1)); // rank within the listed market
  return { format, asOf, trendingDate, historyDays: await historyDays(db, format), rows };
}

export interface PlayerDetail {
  player: typeof players.$inferSelect;
  history: Record<ValueFormat, PricePoint[]>;
  trending: { date: string; adds: number; drops: number }[];
  volatilityPct: Record<ValueFormat, number | null>;
}

export async function getPlayerDetail(db: Db, id: string): Promise<PlayerDetail | null> {
  const [p] = await db.select().from(players).where(eq(players.externalId, id));
  if (!p) return null;
  const [snaps, trend] = await Promise.all([
    db.select().from(valueSnapshots).where(eq(valueSnapshots.playerId, id)),
    db
      .select({ date: trendingSnapshots.date, adds: trendingSnapshots.adds, drops: trendingSnapshots.drops })
      .from(trendingSnapshots)
      .where(eq(trendingSnapshots.playerId, id))
      .orderBy(desc(trendingSnapshots.date))
      .limit(30),
  ]);
  const history = {
    dynasty: toSeries(snaps.filter((s) => s.format === "dynasty")),
    redraft: toSeries(snaps.filter((s) => s.format === "redraft")),
  };
  return {
    player: p,
    history,
    trending: trend,
    volatilityPct: { dynasty: volatility(history.dynasty), redraft: volatility(history.redraft) },
  };
}

export async function getPlayersByIds(db: Db, ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(players).where(inArray(players.externalId, ids));
}

export async function searchPlayers(db: Db, query: string, limit = 10) {
  const q = `%${query.replace(/[%_]/g, "")}%`;
  return db
    .select({ id: players.externalId, name: players.name, position: players.position, team: players.team })
    .from(players)
    .where(sql`${players.name} ilike ${q}`)
    .orderBy(sql`${players.searchRank} asc nulls last`)
    .limit(limit);
}

export async function getCompanies(db: Db) {
  return db.select().from(companyValues).orderBy(desc(companyValues.valueUsd));
}

export async function getLastIngest(db: Db) {
  const [r] = await db.select().from(ingestRuns).orderBy(desc(ingestRuns.id)).limit(1);
  return r ?? null;
}
