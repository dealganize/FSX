/** Turn real Sleeper transactions into a brokerage-style order history for one roster. */
import type { SleeperTransaction } from "../sources/sleeper";

export interface OrderLeg {
  playerId: string;
  value: number | null; // today's value
}

export interface OrderHistoryItem {
  id: string;
  kind: "trade" | "waiver" | "free_agent" | "other";
  createdAt: number; // epoch ms
  week: number | null;
  bought: OrderLeg[];
  sold: OrderLeg[];
  boughtValue: number;
  soldValue: number;
  /** boughtValue − soldValue at today's prices; positive = the roster gained value. */
  netValue: number;
  draftPicksInvolved: boolean;
}

export function orderHistory(
  txs: SleeperTransaction[],
  rosterId: number,
  priceOf: (playerId: string) => number | null,
): OrderHistoryItem[] {
  const seen = new Set<string>();
  const out: OrderHistoryItem[] = [];
  for (const t of txs) {
    if (t.status !== "complete" || seen.has(t.transaction_id)) continue;
    if (!t.roster_ids.includes(rosterId)) continue;
    seen.add(t.transaction_id);
    const bought = Object.entries(t.adds)
      .filter(([, rid]) => rid === rosterId)
      .map(([playerId]) => ({ playerId, value: priceOf(playerId) }));
    const sold = Object.entries(t.drops)
      .filter(([, rid]) => rid === rosterId)
      .map(([playerId]) => ({ playerId, value: priceOf(playerId) }));
    if (bought.length === 0 && sold.length === 0) continue;
    const sum = (legs: OrderLeg[]) => legs.reduce((s, l) => s + (l.value ?? 0), 0);
    const kind = t.type === "trade" || t.type === "waiver" || t.type === "free_agent" ? t.type : "other";
    out.push({
      id: t.transaction_id,
      kind,
      createdAt: t.created,
      week: t.leg ?? null,
      bought,
      sold,
      boughtValue: sum(bought),
      soldValue: sum(sold),
      netValue: sum(bought) - sum(sold),
      draftPicksInvolved: t.draft_picks.length > 0,
    });
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}
