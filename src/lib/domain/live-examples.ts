/** Live examples for lessons and glossary terms, computed from today's market data. */
import { formatPct, formatValue } from "./market";

export type LiveExampleKey =
  | "top-value"
  | "biggest-gainer-30d"
  | "biggest-loser-30d"
  | "most-added"
  | "most-dropped"
  | "injured-top"
  | "position-mix";

/** The slice of market data examples need (a subset of MarketRow). */
export interface ExampleRow {
  id: string;
  name: string;
  position: string | null;
  value: number;
  rank: number;
  change30Pct: number | null;
  adds: number;
  drops: number;
  injuryStatus: string | null;
}

export interface LiveExample {
  text: string;
  playerId?: string;
}

const MIN_VALUE_FOR_MOVERS = 1500; // ignore tiny values where % moves are noise

export function liveExample(key: LiveExampleKey, rows: readonly ExampleRow[]): LiveExample | null {
  if (rows.length === 0) return null;
  const byValue = [...rows].sort((a, b) => b.value - a.value);
  const movers = rows.filter((r) => r.change30Pct !== null && r.value >= MIN_VALUE_FOR_MOVERS);
  switch (key) {
    case "top-value": {
      const p = byValue[0]!;
      return { playerId: p.id, text: `Right now the most valuable player is ${p.name} (${p.position}) at ${formatValue(p.value)}.` };
    }
    case "biggest-gainer-30d": {
      const p = [...movers].sort((a, b) => b.change30Pct! - a.change30Pct!)[0];
      return p ? { playerId: p.id, text: `Biggest 30-day gainer: ${p.name}, ${formatPct(p.change30Pct!)} to ${formatValue(p.value)}.` } : null;
    }
    case "biggest-loser-30d": {
      const p = [...movers].sort((a, b) => a.change30Pct! - b.change30Pct!)[0];
      return p ? { playerId: p.id, text: `Biggest 30-day faller: ${p.name}, ${formatPct(p.change30Pct!)} to ${formatValue(p.value)}.` } : null;
    }
    case "most-added": {
      const p = [...rows].sort((a, b) => b.adds - a.adds)[0];
      return p && p.adds > 0
        ? { playerId: p.id, text: `Highest "volume" today: ${p.name} was added by ${p.adds.toLocaleString("en-US")} Sleeper managers in 24 hours.` }
        : null;
    }
    case "most-dropped": {
      const p = [...rows].sort((a, b) => b.drops - a.drops)[0];
      return p && p.drops > 0
        ? { playerId: p.id, text: `Most dropped today: ${p.name}, dropped by ${p.drops.toLocaleString("en-US")} Sleeper managers in 24 hours.` }
        : null;
    }
    case "injured-top": {
      const p = byValue.find((r) => r.injuryStatus);
      return p
        ? { playerId: p.id, text: `${p.name} (value ${formatValue(p.value)}) is listed as "${p.injuryStatus}". News like this adds risk.` }
        : null;
    }
    case "position-mix": {
      const top = byValue.slice(0, 50);
      const counts = new Map<string, number>();
      for (const r of top) counts.set(r.position ?? "?", (counts.get(r.position ?? "?") ?? 0) + 1);
      const parts = [...counts].sort((a, b) => b[1] - a[1]).map(([pos, n]) => `${n} ${pos}s`);
      return { text: `Of the 50 most valuable players today: ${parts.join(", ")}.` };
    }
  }
}
