/** TutorData backed by the FSX database (used by /api/tutor and the evals). */
import type { Db } from "@/lib/db/client";
import { getCompanies, getMarket, getPlayerDetail, getPlayersByIds, searchPlayers, type MarketData } from "@/lib/repo/market";
import { loadSleeperPortfolio } from "@/lib/repo/sleeper-portfolio";
import type { ValueFormat } from "@/lib/sources/fantasycalc";
import type { TutorData } from "./tools";

export async function lookupPlayers(db: Db, ids: string[]) {
  const rows = await getPlayersByIds(db, ids);
  return new Map(rows.map((r) => [r.externalId, { name: r.name, position: r.position, team: r.team }]));
}

export function dbTutorData(db: Db): TutorData {
  const markets = new Map<ValueFormat, Promise<MarketData>>();
  const market = (f: ValueFormat) => {
    if (!markets.has(f)) markets.set(f, getMarket(db, f));
    return markets.get(f)!;
  };
  return {
    market,
    player: (id) => getPlayerDetail(db, id),
    search: (q) => searchPlayers(db, q, 8),
    companies: () => getCompanies(db),
    async sleeperPortfolio(username, leagueId) {
      const [d, r] = await Promise.all([market("dynasty"), market("redraft")]);
      return loadSleeperPortfolio(username, leagueId, { dynasty: d.rows, redraft: r.rows }, (ids) => lookupPlayers(db, ids));
    },
  };
}
