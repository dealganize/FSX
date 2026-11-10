/**
 * Daily snapshot job: players (max once per 24h), FantasyCalc values (dynasty + redraft),
 * Sleeper trending, and company values. Idempotent per day: re-running replaces today's rows.
 */
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { companyValues, ingestRuns, players, trendingSnapshots, valueSnapshots } from "../db/schema";
import type { FantasyCalcRow, ValueFormat } from "../sources/fantasycalc";
import { sleeperDisplayName, type SleeperPlayer, type SleeperTrending } from "../sources/sleeper";
import type { CompanyValueInput, MarketSources } from "./market-sources";

export const FANTASY_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);
const FORMATS: ValueFormat[] = ["dynasty", "redraft"];

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

// ---------- pure transforms (unit tested) ----------

export function toPlayerRows(list: SleeperPlayer[]): (typeof players.$inferInsert)[] {
  return list
    .filter((p) => p.position && FANTASY_POSITIONS.has(p.position))
    .map((p) => ({
      sport: "nfl" as const,
      externalId: p.player_id,
      name: p.position === "DEF" ? `${p.team ?? p.player_id} Defense` : sleeperDisplayName(p),
      position: p.position,
      team: p.team,
      age: p.age,
      yearsExp: p.years_exp,
      status: p.status,
      injuryStatus: p.injury_status,
      injuryStartDate: p.injury_start_date,
      injuryBodyPart: p.injury_body_part,
      injuryNotes: p.injury_notes,
      depthChartOrder: p.depth_chart_order,
      searchRank: p.search_rank,
      updatedAt: new Date(),
    }));
}

export function toValueRows(
  rows: FantasyCalcRow[],
  format: ValueFormat,
  date: string,
): (typeof valueSnapshots.$inferInsert)[] {
  const seen = new Set<string>();
  const out: (typeof valueSnapshots.$inferInsert)[] = [];
  for (const r of rows) {
    const id = r.player.sleeperId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      sport: "nfl",
      playerId: id,
      format,
      date,
      source: "fantasycalc",
      value: Math.round(r.value),
      overallRank: r.overallRank,
      positionRank: r.positionRank,
      trend30Day: Math.round(r.trend30Day),
      derived: false,
    });
  }
  return out;
}

/**
 * One derived history point per player with no history yet: value 30 days ago = value − trend30Day.
 * Labelled `derived` and shown as such in the UI. Never invents more than this (ADR 0002).
 */
export function derivedStartRows(
  today: (typeof valueSnapshots.$inferInsert)[],
  playersWithHistory: Set<string>,
): (typeof valueSnapshots.$inferInsert)[] {
  return today
    .filter((r) => !playersWithHistory.has(r.playerId) && r.trend30Day !== null && r.trend30Day !== undefined)
    .map((r) => ({
      ...r,
      date: addDays(r.date, -30),
      value: Math.max(0, r.value - (r.trend30Day ?? 0)),
      overallRank: null,
      positionRank: null,
      source: "fantasycalc-trend30",
      derived: true,
    }));
}

export function toTrendingRows(
  adds: SleeperTrending[],
  drops: SleeperTrending[],
  date: string,
): (typeof trendingSnapshots.$inferInsert)[] {
  const map = new Map<string, { adds: number; drops: number }>();
  for (const a of adds) map.set(a.player_id, { adds: a.count, drops: map.get(a.player_id)?.drops ?? 0 });
  for (const d of drops) map.set(d.player_id, { adds: map.get(d.player_id)?.adds ?? 0, drops: d.count });
  return [...map].map(([playerId, v]) => ({ sport: "nfl" as const, playerId, date, ...v }));
}

/** Reject a company value that jumps more than 10× from the stored one (likely a filing error). */
export function saneCompanyValue(next: number, previous: number | undefined): boolean {
  if (!(next > 0)) return false;
  if (previous === undefined) return true;
  return next / previous <= 10 && previous / next <= 10;
}

// ---------- job ----------

async function insertChunked<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await fn(items.slice(i, i + size));
}

export interface SnapshotResult {
  date: string;
  counts: Record<string, number>;
}

export async function runSnapshot(
  db: Db,
  sources: MarketSources,
  opts: { date?: string; forcePlayers?: boolean } = {},
): Promise<SnapshotResult> {
  const date = opts.date ?? isoDate(new Date());
  const counts: Record<string, number> = {};
  const [run] = await db.insert(ingestRuns).values({ job: `snapshot:${sources.name}`, status: "running" }).returning();

  try {
    // 1. Players: Sleeper asks for at most one /players/nfl call per day.
    const [fresh] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(players)
      .where(sql`${players.updatedAt} > now() - interval '24 hours'`);
    if (opts.forcePlayers || !fresh || fresh.n === 0) {
      const { players: list, invalid } = await sources.players();
      const rows = toPlayerRows(list);
      await insertChunked(rows, 500, (chunk) =>
        db
          .insert(players)
          .values(chunk)
          .onConflictDoUpdate({
            target: [players.sport, players.externalId],
            set: {
              name: sql`excluded.name`,
              position: sql`excluded.position`,
              team: sql`excluded.team`,
              age: sql`excluded.age`,
              yearsExp: sql`excluded.years_exp`,
              status: sql`excluded.status`,
              injuryStatus: sql`excluded.injury_status`,
              injuryStartDate: sql`excluded.injury_start_date`,
              injuryBodyPart: sql`excluded.injury_body_part`,
              injuryNotes: sql`excluded.injury_notes`,
              depthChartOrder: sql`excluded.depth_chart_order`,
              searchRank: sql`excluded.search_rank`,
              updatedAt: sql`excluded.updated_at`,
            },
          }),
      );
      counts.players = rows.length;
      counts.playersInvalid = invalid;
    }

    // 2. Values (the "price"), dynasty and redraft.
    for (const format of FORMATS) {
      const { rows, invalid } = await sources.values(format);
      const today = toValueRows(rows, format, date);
      const ids = today.map((r) => r.playerId);
      const existing = ids.length
        ? await db
            .selectDistinct({ id: valueSnapshots.playerId })
            .from(valueSnapshots)
            .where(
              and(
                eq(valueSnapshots.format, format),
                lt(valueSnapshots.date, date),
                inArray(valueSnapshots.playerId, ids),
              ),
            )
        : [];
      const derived = derivedStartRows(today, new Set(existing.map((e) => e.id)));
      await insertChunked([...derived, ...today], 500, (chunk) =>
        db
          .insert(valueSnapshots)
          .values(chunk)
          .onConflictDoUpdate({
            target: [valueSnapshots.sport, valueSnapshots.playerId, valueSnapshots.format, valueSnapshots.date],
            set: {
              value: sql`excluded.value`,
              overallRank: sql`excluded.overall_rank`,
              positionRank: sql`excluded.position_rank`,
              trend30Day: sql`excluded.trend_30_day`,
              source: sql`excluded.source`,
              derived: sql`excluded.derived`,
            },
          }),
      );
      counts[`values_${format}`] = today.length;
      counts[`values_${format}_derived`] = derived.length;
      counts[`values_${format}_invalid`] = invalid;
    }

    // 3. Volume: trending adds/drops in the last 24h.
    const [adds, drops] = await Promise.all([sources.trending("add"), sources.trending("drop")]);
    const trend = toTrendingRows(adds, drops, date);
    await db.delete(trendingSnapshots).where(eq(trendingSnapshots.date, date));
    await insertChunked(trend, 500, (chunk) => db.insert(trendingSnapshots).values(chunk));
    counts.trending = trend.length;

    // 4. Company values for the Player ⇄ Stock match.
    counts.companies = await upsertCompanies(db, await sources.companies());

    await db
      .update(ingestRuns)
      .set({ status: "ok", finishedAt: new Date(), counts })
      .where(eq(ingestRuns.id, run!.id));
    return { date, counts };
  } catch (err) {
    await db
      .update(ingestRuns)
      .set({ status: "error", finishedAt: new Date(), counts, error: (err as Error).message })
      .where(eq(ingestRuns.id, run!.id));
    throw err;
  }
}

async function upsertCompanies(db: Db, list: CompanyValueInput[]): Promise<number> {
  const prev = new Map((await db.select().from(companyValues)).map((c) => [c.ticker, c.valueUsd]));
  let n = 0;
  for (const c of list) {
    if (!saneCompanyValue(c.valueUsd, prev.get(c.ticker))) continue;
    await db
      .insert(companyValues)
      .values({ ...c, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: companyValues.ticker,
        set: { valueUsd: c.valueUsd, asOf: c.asOf, form: c.form, name: c.name, updatedAt: new Date() },
      });
    n++;
  }
  return n;
}
