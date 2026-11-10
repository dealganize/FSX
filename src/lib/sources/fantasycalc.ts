/**
 * FantasyCalc values. Terms: https://fantasycalc.com/terms-of-usage
 * - Only GET /values/current may be called programmatically.
 * - Cache and reuse responses; refresh each query at most every 3 hours (we do once a day).
 * - Attribution with a link to fantasycalc.com next to the data, in server-rendered HTML.
 * See docs/decisions/0002-fantasycalc-values.md.
 */
import { z } from "zod";
import { fetchJson, parseRows } from "./http";

const SOURCE = "fantasycalc";
export const FANTASYCALC_URL = "https://fantasycalc.com";

export type ValueFormat = "dynasty" | "redraft";

export const fantasyCalcRowSchema = z.object({
  player: z.object({
    id: z.number(),
    name: z.string(),
    sleeperId: z.string().nullish(),
    position: z.string(),
    maybeTeam: z.string().nullish(),
    maybeAge: z.number().nullish(),
  }),
  value: z.number(),
  overallRank: z.number(),
  positionRank: z.number(),
  trend30Day: z.number().nullish().transform((v) => v ?? 0),
});
export type FantasyCalcRow = z.output<typeof fantasyCalcRowSchema>;

export function fantasyCalcUrl(format: ValueFormat): string {
  const isDynasty = format === "dynasty";
  return `https://api.fantasycalc.com/values/current?isDynasty=${isDynasty}&numQbs=1&numTeams=12&ppr=1`;
}

export async function getValues(format: ValueFormat): Promise<{ rows: FantasyCalcRow[]; invalid: number }> {
  const raw = await fetchJson(fantasyCalcUrl(format), { source: SOURCE, timeoutMs: 30_000 });
  const { valid, invalid } = parseRows(fantasyCalcRowSchema, raw);
  // Draft picks are listed with position "PICK" and no Sleeper id: they are not players.
  const rows = valid.filter((r) => r.player.position !== "PICK" && r.player.sleeperId);
  return { rows, invalid };
}
