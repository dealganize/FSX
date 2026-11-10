/**
 * A Sleeper user's real roster(s) valued as holdings, and their transactions as order history.
 * Live by default; set FSX_SLEEPER_FIXTURES=1 to read the recorded fixtures (CI, e2e, evals).
 * Per-user data is fetched on demand with a short cache and never stored (ADR 0001).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import * as sleeper from "../sources/sleeper";
import { parseRows } from "../sources/http";
import type { SleeperLeague, SleeperRoster, SleeperTransaction, SleeperUser } from "../sources/sleeper";
import { orderHistory, type OrderHistoryItem } from "../domain/activity";
import { diversification, portfolioValue, type Diversification, type Holding } from "../domain/portfolio";
import type { MarketRow } from "./market";

interface SleeperReader {
  user(username: string): Promise<SleeperUser | null>;
  season(): Promise<{ season: string; week: number }>;
  leagues(userId: string, season: string): Promise<SleeperLeague[]>;
  rosters(leagueId: string): Promise<SleeperRoster[]>;
  transactions(leagueId: string, weeks: number): Promise<SleeperTransaction[]>;
}

const live: SleeperReader = {
  user: (u) => sleeper.getUser(u),
  season: async () => {
    const s = await sleeper.getState();
    return { season: s.season, week: s.week };
  },
  leagues: (id, season) => sleeper.getUserLeagues(id, season),
  rosters: (id) => sleeper.getLeagueRosters(id),
  async transactions(leagueId, weeks) {
    const all: SleeperTransaction[] = [];
    for (let w = 1; w <= Math.max(1, weeks); w++) all.push(...(await sleeper.getTransactions(leagueId, w)));
    return all;
  },
};

const dir = () => path.join(process.cwd(), "fixtures", "sleeper");
const readJson = async (file: string) => JSON.parse(await readFile(path.join(dir(), file), "utf8")) as unknown;

const fixtures: SleeperReader = {
  async user(u) {
    try {
      return sleeper.sleeperUserSchema.parse(await readJson(`user-${u.toLowerCase()}.json`));
    } catch {
      return null;
    }
  },
  async season() {
    const s = sleeper.sleeperStateSchema.parse(await readJson("state.json"));
    return { season: s.season, week: s.week };
  },
  async leagues(_id, season) {
    return parseRows(sleeper.sleeperLeagueSchema, await readJson(`leagues-${season}.json`)).valid;
  },
  async rosters(id) {
    return parseRows(sleeper.sleeperRosterSchema, await readJson(`rosters-${id}.json`)).valid;
  },
  async transactions(id) {
    return parseRows(sleeper.sleeperTransactionSchema, await readJson(`transactions-${id}.json`)).valid;
  },
};

export function sleeperReader(): SleeperReader {
  return process.env.FSX_SLEEPER_FIXTURES === "1" ? fixtures : live;
}

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{2,30}$/;

export interface LeagueSummary {
  id: string;
  name: string;
  teams: number;
  isDynasty: boolean;
}

export interface SleeperPortfolio {
  username: string;
  displayName: string;
  season: string;
  leagues: LeagueSummary[];
  league: LeagueSummary;
  format: "dynasty" | "redraft";
  rosterId: number;
  holdings: (Holding & { team: string | null; starter: boolean; rank: number | null; change30Pct: number | null })[];
  unpriced: number;
  total: number;
  diversification: Diversification;
}

export type PortfolioResult =
  | { ok: true; portfolio: SleeperPortfolio }
  | { ok: false; reason: "invalid-username" | "user-not-found" | "no-leagues" | "no-roster" | "unavailable"; message: string };

export async function loadSleeperPortfolio(
  username: string,
  leagueId: string | undefined,
  markets: { dynasty: MarketRow[]; redraft: MarketRow[] },
  lookupPlayers: (ids: string[]) => Promise<Map<string, { name: string; position: string | null; team: string | null }>>,
): Promise<PortfolioResult> {
  if (!USERNAME_PATTERN.test(username)) {
    return { ok: false, reason: "invalid-username", message: "Sleeper usernames use letters, numbers and underscores." };
  }
  const r = sleeperReader();
  try {
    const user = await r.user(username);
    if (!user) return { ok: false, reason: "user-not-found", message: `No Sleeper user called "${username}".` };
    const { season } = await r.season();
    const leagues = await r.leagues(user.user_id, season);
    if (leagues.length === 0) return { ok: false, reason: "no-leagues", message: `${username} has no NFL leagues in ${season}.` };
    const summaries: LeagueSummary[] = leagues.map((l) => ({
      id: l.league_id,
      name: l.name,
      teams: l.total_rosters,
      isDynasty: l.settings?.type === 2,
    }));
    // Default to a dynasty league (FSX's default market); value each league with its own format.
    const league = summaries.find((l) => l.id === leagueId) ?? summaries.find((l) => l.isDynasty) ?? summaries[0]!;
    const market = league.isDynasty ? markets.dynasty : markets.redraft;
    const rosters = await r.rosters(league.id);
    const roster = rosters.find((x) => x.owner_id === user.user_id);
    if (!roster) return { ok: false, reason: "no-roster", message: `${username} has no roster in ${league.name}.` };

    const byId = new Map(market.map((m) => [m.id, m]));
    const names = await lookupPlayers(roster.players.filter((id) => !byId.has(id)));
    const starters = new Set(roster.starters);
    const holdings = roster.players.map((id) => {
      const m = byId.get(id);
      const meta = m ?? names.get(id);
      return {
        playerId: id,
        name: meta?.name ?? `Player ${id}`,
        position: meta?.position ?? null,
        team: meta?.team ?? null,
        quantity: 1,
        price: m?.value ?? null,
        starter: starters.has(id),
        rank: m?.rank ?? null,
        change30Pct: m?.change30Pct ?? null,
      };
    });
    holdings.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    return {
      ok: true,
      portfolio: {
        username,
        displayName: user.display_name ?? username,
        season,
        leagues: summaries,
        league,
        format: league.isDynasty ? "dynasty" : "redraft",
        rosterId: roster.roster_id,
        holdings,
        unpriced: holdings.filter((h) => h.price === null).length,
        total: portfolioValue(holdings),
        diversification: diversification(holdings),
      },
    };
  } catch (e) {
    return { ok: false, reason: "unavailable", message: `Sleeper could not be reached (${(e as Error).message}).` };
  }
}

export async function loadActivity(
  portfolio: SleeperPortfolio,
  markets: { dynasty: MarketRow[]; redraft: MarketRow[] },
): Promise<{ items: OrderHistoryItem[] } | { error: string }> {
  const r = sleeperReader();
  try {
    const { week } = await r.season();
    const txs = await r.transactions(portfolio.league.id, week);
    const price = new Map(markets[portfolio.format].map((m) => [m.id, m.value]));
    return { items: orderHistory(txs, portfolio.rosterId, (id) => price.get(id) ?? null) };
  } catch (e) {
    return { error: `Sleeper could not be reached (${(e as Error).message}).` };
  }
}
