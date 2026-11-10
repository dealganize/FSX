/** Trim market rows to what client components need, to keep the RSC payload small. */
import type { MatchPlayer } from "@/components/market/match-card";
import type { MarketRow } from "./market";

export function toMatchPlayers(rows: MarketRow[]): MatchPlayer[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    position: r.position,
    value: r.value,
    rank: r.rank,
    age: r.age,
    change30Pct: r.change30Pct,
    injuryStatus: r.injuryStatus,
  }));
}
