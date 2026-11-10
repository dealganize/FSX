/**
 * SEC EDGAR XBRL API: public float (dei:EntityPublicFloat) per company.
 * Free, no key. SEC asks automated clients to send a User-Agent that identifies them,
 * which we read from SEC_USER_AGENT (set by the operator). See docs/decisions/0004.
 */
import { z } from "zod";
import { fetchJson, parseOrThrow } from "./http";

const SOURCE = "sec";

export const secConceptSchema = z.object({
  cik: z.number(),
  entityName: z.string(),
  units: z.object({
    USD: z.array(
      z.object({
        end: z.string(),
        val: z.number(),
        form: z.string().optional(),
        filed: z.string().optional(),
      }),
    ),
  }),
});

export interface PublicFloat {
  cik: number;
  entityName: string;
  valueUsd: number;
  asOf: string; // YYYY-MM-DD
  form: string | null;
  filed: string | null;
}

export function padCik(cik: number): string {
  return String(cik).padStart(10, "0");
}

/** Pick the most recent reported value from a companyconcept response. */
export function latestPublicFloat(raw: unknown): PublicFloat {
  const data = parseOrThrow(secConceptSchema, raw, SOURCE);
  const latest = [...data.units.USD].sort((a, b) => (a.end < b.end ? 1 : a.end > b.end ? -1 : 0))[0];
  if (!latest) throw new Error(`${SOURCE}: no public float reported for CIK ${data.cik}`);
  return {
    cik: data.cik,
    entityName: data.entityName,
    valueUsd: latest.val,
    asOf: latest.end,
    form: latest.form ?? null,
    filed: latest.filed ?? null,
  };
}

export async function getPublicFloat(cik: number, userAgent: string): Promise<PublicFloat> {
  const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${padCik(cik)}/dei/EntityPublicFloat.json`;
  const raw = await fetchJson(url, { source: SOURCE, headers: { "user-agent": userAgent } });
  return latestPublicFloat(raw);
}
