/**
 * Player ⇄ Stock match (spec §4.8): pair a player with a real company at the same
 * percentile of its own market, plus a "style" label. An analogy for teaching, not advice.
 */

export interface RankedCompany {
  ticker: string;
  name: string;
  valueUsd: number;
  asOf: string;
}

/** 0 = most valuable, 1 = least valuable. */
export function percentileOf(rankOneBased: number, count: number): number {
  if (count <= 1) return 0;
  return (Math.min(Math.max(rankOneBased, 1), count) - 1) / (count - 1);
}

/** Company at the same percentile. `companies` can be in any order. */
export function matchCompany<T extends RankedCompany>(
  playerRank: number,
  playerCount: number,
  companies: readonly T[],
): { company: T; companyRank: number; percentile: number } | null {
  if (companies.length === 0 || playerCount === 0) return null;
  const sorted = [...companies].sort((a, b) => b.valueUsd - a.valueUsd);
  const percentile = percentileOf(playerRank, playerCount);
  const index = Math.round(percentile * (sorted.length - 1));
  return { company: sorted[index]!, companyRank: index + 1, percentile };
}

/** "Top 3%" style text for a 0..1 percentile. */
export function topPercentText(percentile: number): string {
  const top = Math.max(1, Math.round(percentile * 100));
  return top >= 50 ? `bottom ${Math.max(1, 100 - top)}%` : `top ${top}%`;
}

export type InvestingStyle = "growth" | "blue-chip" | "high-risk" | "steady";

export interface StyleInput {
  age: number | null;
  overallRank: number;
  trend30Pct: number | null;
  injuryStatus: string | null;
}

export const STYLE_COPY: Record<InvestingStyle, { label: string; stock: string; fantasy: string }> = {
  growth: {
    label: "Growth stock",
    stock: "A younger company whose price is rising because investors expect bigger things later.",
    fantasy: "A young player whose value has been climbing as managers bet on his future.",
  },
  "blue-chip": {
    label: "Blue chip",
    stock: "A large, established company that many investors see as reliable.",
    fantasy: "An established star near the top of the market who most managers would build around.",
  },
  "high-risk": {
    label: "High risk",
    stock: "A stock that has fallen sharply or faces bad news; it could recover or keep falling.",
    fantasy: "A player who is injured or whose value dropped a lot this month.",
  },
  steady: {
    label: "Steady",
    stock: "A stock without a strong trend either way right now.",
    fantasy: "A player whose value has not moved much this month.",
  },
};

const INJURED = new Set(["Out", "IR", "PUP", "Doubtful", "Sus", "NA"]);

export function investingStyle(p: StyleInput): InvestingStyle {
  if ((p.injuryStatus && INJURED.has(p.injuryStatus)) || (p.trend30Pct !== null && p.trend30Pct <= -15)) {
    return "high-risk";
  }
  if (p.age !== null && p.age <= 24 && (p.trend30Pct ?? 0) > 0) return "growth";
  if (p.overallRank <= 36 && (p.age ?? 0) >= 25) return "blue-chip";
  return "steady";
}

export function formatUsdBillions(usd: number): string {
  if (usd >= 1e12) return `$${(usd / 1e12).toFixed(2)} trillion`;
  return `$${(usd / 1e9).toFixed(1)} billion`;
}
