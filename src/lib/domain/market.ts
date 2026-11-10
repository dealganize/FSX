/** Pure market maths. Every number the UI or the tutor shows comes from functions like these. */

export interface PricePoint {
  date: string; // YYYY-MM-DD
  value: number;
  derived?: boolean;
}

export interface Change {
  abs: number;
  pct: number; // percent, e.g. 4.2 means +4.2 %
  fromDate: string;
  toDate: string;
}

export function pctChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}

export function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Change from the previous *real* (non-derived) point to the latest one. */
export function dailyChange(series: PricePoint[]): Change | null {
  const real = series.filter((p) => !p.derived);
  if (real.length < 2) return null;
  const a = real[real.length - 2]!;
  const b = real[real.length - 1]!;
  return { abs: b.value - a.value, pct: pctChange(a.value, b.value), fromDate: a.date, toDate: b.date };
}

/** Change over ~`days` days: latest point vs the newest point at or before (latest − days). */
export function changeOver(series: PricePoint[], days: number): Change | null {
  if (series.length < 2) return null;
  const last = series[series.length - 1]!;
  const cutoff = new Date(`${last.date}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const base = [...series].reverse().find((p) => p.date <= cutoffIso);
  if (!base) return null;
  return { abs: last.value - base.value, pct: pctChange(base.value, last.value), fromDate: base.date, toDate: last.date };
}

/** FantasyCalc's own 30-day trend, as a change, for when our stored history is still short. */
export function trendChange(value: number, trend30Day: number | null | undefined): Pick<Change, "abs" | "pct"> | null {
  if (trend30Day === null || trend30Day === undefined) return null;
  const before = value - trend30Day;
  return { abs: trend30Day, pct: pctChange(before, value) };
}

export const MIN_POINTS_FOR_VOLATILITY = 7;

/**
 * Volatility = standard deviation of day-to-day % changes, using real points only.
 * Returns null until there are enough days of history to say anything honest.
 */
export function volatility(series: PricePoint[]): number | null {
  const real = series.filter((p) => !p.derived);
  if (real.length < MIN_POINTS_FOR_VOLATILITY) return null;
  const returns: number[] = [];
  for (let i = 1; i < real.length; i++) returns.push(pctChange(real[i - 1]!.value, real[i]!.value));
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

export type VolatilityBand = "calm" | "normal" | "jumpy";
export function volatilityBand(dailyStdPct: number): VolatilityBand {
  if (dailyStdPct < 1) return "calm";
  if (dailyStdPct < 3) return "normal";
  return "jumpy";
}

/** Size of a move as a teaching label, from a % change. */
export function moveSize(pct: number): "flat" | "small" | "big" | "huge" {
  const a = Math.abs(pct);
  if (a < 1) return "flat";
  if (a < 10) return "small";
  if (a < 25) return "big";
  return "huge";
}

export function formatPct(pct: number, digits = 1): string {
  const r = round(pct, digits);
  return `${r > 0 ? "+" : ""}${r.toFixed(digits)}%`;
}

export function formatSigned(n: number): string {
  const r = Math.round(n);
  return `${r > 0 ? "+" : ""}${r.toLocaleString("en-US")}`;
}

export function formatValue(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
