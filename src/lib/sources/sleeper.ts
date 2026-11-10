/**
 * Sleeper public API client (https://docs.sleeper.com). Read-only, no key.
 * Guidance: stay under 1000 calls/min; call /players/nfl at most once per day.
 * See docs/decisions/0001-sleeper-api.md.
 */
import { z } from "zod";
import { fetchJson, parseOrThrow, parseRows } from "./http";

export const SLEEPER_BASE = "https://api.sleeper.app/v1";
const SOURCE = "sleeper";

const nullableString = z.string().nullish().transform((v) => v ?? null);
const nullableNumber = z.number().nullish().transform((v) => v ?? null);

export const sleeperPlayerSchema = z.object({
  player_id: z.string(),
  first_name: nullableString,
  last_name: nullableString,
  position: nullableString,
  team: nullableString,
  age: nullableNumber,
  years_exp: nullableNumber,
  status: nullableString,
  injury_status: nullableString,
  injury_start_date: nullableString,
  injury_body_part: nullableString,
  injury_notes: nullableString,
  depth_chart_order: nullableNumber,
  depth_chart_position: nullableString,
  search_rank: nullableNumber,
  number: nullableNumber,
  college: nullableString,
});
export type SleeperPlayer = z.output<typeof sleeperPlayerSchema>;

export const sleeperStateSchema = z.object({
  week: z.number(),
  season: z.string(),
  season_type: z.string(),
  display_week: z.number().optional(),
});
export type SleeperState = z.output<typeof sleeperStateSchema>;

export const sleeperUserSchema = z.object({
  user_id: z.string(),
  username: z.string().nullish(),
  display_name: z.string().nullish(),
  avatar: z.string().nullish(),
});
export type SleeperUser = z.output<typeof sleeperUserSchema>;

export const sleeperLeagueSchema = z.object({
  league_id: z.string(),
  name: z.string(),
  season: z.string(),
  status: z.string(),
  total_rosters: z.number(),
  settings: z.object({ type: z.number().optional() }).partial().nullish(),
  scoring_settings: z.object({ rec: z.number().optional() }).partial().nullish(),
});
export type SleeperLeague = z.output<typeof sleeperLeagueSchema>;

export const sleeperRosterSchema = z.object({
  roster_id: z.number(),
  owner_id: z.string().nullish(),
  league_id: z.string(),
  players: z.array(z.string()).nullish().transform((v) => v ?? []),
  starters: z.array(z.string()).nullish().transform((v) => v ?? []),
  reserve: z.array(z.string()).nullish().transform((v) => v ?? []),
});
export type SleeperRoster = z.output<typeof sleeperRosterSchema>;

export const sleeperLeagueUserSchema = z.object({
  user_id: z.string(),
  display_name: z.string().nullish(),
  metadata: z.object({ team_name: z.string().optional() }).partial().nullish(),
});
export type SleeperLeagueUser = z.output<typeof sleeperLeagueUserSchema>;

const playerIdMap = z.record(z.string(), z.number()).nullish().transform((v) => v ?? {});

export const sleeperTransactionSchema = z.object({
  transaction_id: z.string(),
  type: z.enum(["trade", "free_agent", "waiver", "commissioner"]).or(z.string()),
  status: z.string(),
  created: z.number(),
  status_updated: z.number().nullish(),
  leg: z.number().nullish(),
  roster_ids: z.array(z.number()).nullish().transform((v) => v ?? []),
  adds: playerIdMap,
  drops: playerIdMap,
  draft_picks: z.array(z.unknown()).nullish().transform((v) => v ?? []),
  settings: z.object({ waiver_bid: z.number().optional() }).partial().nullish(),
});
export type SleeperTransaction = z.output<typeof sleeperTransactionSchema>;

export const sleeperTrendingSchema = z.object({ player_id: z.string(), count: z.number() });
export type SleeperTrending = z.output<typeof sleeperTrendingSchema>;

/** Short cache for per-user data (15 min). Player and trending data go through the daily job. */
const USER_DATA_REVALIDATE = 900;

export async function getAllPlayers(): Promise<{ players: SleeperPlayer[]; invalid: number }> {
  const raw = await fetchJson(`${SLEEPER_BASE}/players/nfl`, { source: SOURCE, timeoutMs: 60_000 });
  const values = raw && typeof raw === "object" ? Object.values(raw) : [];
  const { valid, invalid } = parseRows(sleeperPlayerSchema, values);
  return { players: valid, invalid };
}

export async function getState(): Promise<SleeperState> {
  const raw = await fetchJson(`${SLEEPER_BASE}/state/nfl`, { source: SOURCE, revalidate: 3600 });
  return parseOrThrow(sleeperStateSchema, raw, SOURCE);
}

export async function getTrending(
  type: "add" | "drop",
  lookbackHours = 24,
  limit = 200,
): Promise<SleeperTrending[]> {
  const url = `${SLEEPER_BASE}/players/nfl/trending/${type}?lookback_hours=${lookbackHours}&limit=${limit}`;
  const raw = await fetchJson(url, { source: SOURCE });
  return parseRows(sleeperTrendingSchema, raw).valid;
}

/** Returns null when the username does not exist (Sleeper answers `null`). */
export async function getUser(usernameOrId: string): Promise<SleeperUser | null> {
  const raw = await fetchJson(`${SLEEPER_BASE}/user/${encodeURIComponent(usernameOrId)}`, {
    source: SOURCE,
    revalidate: USER_DATA_REVALIDATE,
  });
  if (raw === null) return null;
  return parseOrThrow(sleeperUserSchema, raw, SOURCE);
}

export async function getUserLeagues(userId: string, season: string): Promise<SleeperLeague[]> {
  const raw = await fetchJson(`${SLEEPER_BASE}/user/${userId}/leagues/nfl/${season}`, {
    source: SOURCE,
    revalidate: USER_DATA_REVALIDATE,
  });
  return parseRows(sleeperLeagueSchema, raw).valid;
}

export async function getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
  const raw = await fetchJson(`${SLEEPER_BASE}/league/${leagueId}/rosters`, {
    source: SOURCE,
    revalidate: USER_DATA_REVALIDATE,
  });
  return parseRows(sleeperRosterSchema, raw).valid;
}

export async function getLeagueUsers(leagueId: string): Promise<SleeperLeagueUser[]> {
  const raw = await fetchJson(`${SLEEPER_BASE}/league/${leagueId}/users`, {
    source: SOURCE,
    revalidate: USER_DATA_REVALIDATE,
  });
  return parseRows(sleeperLeagueUserSchema, raw).valid;
}

export async function getTransactions(leagueId: string, week: number): Promise<SleeperTransaction[]> {
  const raw = await fetchJson(`${SLEEPER_BASE}/league/${leagueId}/transactions/${week}`, {
    source: SOURCE,
    revalidate: USER_DATA_REVALIDATE,
  });
  return parseRows(sleeperTransactionSchema, raw).valid;
}

export function sleeperDisplayName(p: Pick<SleeperPlayer, "first_name" | "last_name" | "player_id">): string {
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || `Player ${p.player_id}`;
}
