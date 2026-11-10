/** Portfolio maths: value, gain/loss and diversification by position ("sector"). */

export interface Holding {
  playerId: string;
  name: string;
  position: string | null;
  quantity: number;
  price: number | null; // today's value per share; null when the player has no market value
  costBasis?: number; // total paid, for paper portfolios
}

export interface PositionSlice {
  position: string;
  value: number;
  share: number; // 0..1
  count: number;
}

export interface Diversification {
  total: number;
  slices: PositionSlice[];
  top: PositionSlice | null;
  /** Herfindahl index 0..1: sum of squared shares. 1 = everything in one position. */
  hhi: number;
  level: "diversified" | "balanced" | "concentrated";
}

export function holdingValue(h: Holding): number {
  return h.price === null ? 0 : h.price * h.quantity;
}

export function portfolioValue(holdings: Holding[]): number {
  return holdings.reduce((s, h) => s + holdingValue(h), 0);
}

export function diversification(holdings: Holding[]): Diversification {
  const byPos = new Map<string, { value: number; count: number }>();
  for (const h of holdings) {
    const v = holdingValue(h);
    if (v <= 0) continue;
    const key = h.position ?? "Other";
    const cur = byPos.get(key) ?? { value: 0, count: 0 };
    byPos.set(key, { value: cur.value + v, count: cur.count + 1 });
  }
  const total = [...byPos.values()].reduce((s, x) => s + x.value, 0);
  const slices = [...byPos]
    .map(([position, x]) => ({ position, value: x.value, count: x.count, share: total ? x.value / total : 0 }))
    .sort((a, b) => b.value - a.value);
  const hhi = slices.reduce((s, x) => s + x.share ** 2, 0);
  const top = slices[0] ?? null;
  const level = !top ? "diversified" : top.share >= 0.5 ? "concentrated" : top.share >= 0.35 ? "balanced" : "diversified";
  return { total, slices, top, hhi, level };
}

export function unrealisedGain(h: Holding): { abs: number; pct: number } | null {
  if (h.costBasis === undefined || h.price === null || h.costBasis <= 0) return null;
  const now = holdingValue(h);
  return { abs: now - h.costBasis, pct: ((now - h.costBasis) / h.costBasis) * 100 };
}
