/**
 * Where the daily job gets its data. `liveSources` calls the real APIs; `fixtureSources`
 * reads the recorded responses in fixtures/ (tests, CI, offline demo seed).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseRows } from "../sources/http";
import * as sleeper from "../sources/sleeper";
import * as fantasycalc from "../sources/fantasycalc";
import type { FantasyCalcRow, ValueFormat } from "../sources/fantasycalc";
import type { SleeperPlayer, SleeperTrending } from "../sources/sleeper";
import { getPublicFloat } from "../sources/sec";
import { COMPANIES } from "@/data/companies";
import companySeed from "@/data/company-values.seed.json";

export interface CompanyValueInput {
  ticker: string;
  cik: number;
  name: string;
  valueUsd: number;
  asOf: string;
  form: string | null;
}

export interface MarketSources {
  name: "live" | "fixtures";
  players(): Promise<{ players: SleeperPlayer[]; invalid: number }>;
  values(format: ValueFormat): Promise<{ rows: FantasyCalcRow[]; invalid: number }>;
  trending(type: "add" | "drop"): Promise<SleeperTrending[]>;
  companies(): Promise<CompanyValueInput[]>;
}

export function seedCompanies(): CompanyValueInput[] {
  return companySeed.companies.map((c) => ({ ...c, form: c.form ?? null }));
}

export const liveSources: MarketSources = {
  name: "live",
  players: () => sleeper.getAllPlayers(),
  values: (format) => fantasycalc.getValues(format),
  trending: (type) => sleeper.getTrending(type, 24, 200),
  async companies() {
    const ua = process.env.SEC_USER_AGENT;
    if (!ua) return seedCompanies();
    const out: CompanyValueInput[] = [];
    for (const c of COMPANIES) {
      await new Promise((r) => setTimeout(r, 150)); // SEC fair access: < 10 requests/second
      try {
        const pf = await getPublicFloat(c.cik, ua);
        out.push({ ticker: c.ticker, cik: c.cik, name: c.name, valueUsd: pf.valueUsd, asOf: pf.asOf, form: pf.form });
      } catch {
        // keep the previous value for this company (the job only upserts what it got)
      }
    }
    return out;
  },
};

const FIXTURES = path.join(process.cwd(), "fixtures");
async function readFixture(rel: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(FIXTURES, rel), "utf8"));
}

export const fixtureSources: MarketSources = {
  name: "fixtures",
  async players() {
    const raw = (await readFixture("sleeper/players-nfl.trimmed.json")) as Record<string, unknown>;
    const { valid, invalid } = parseRows(sleeper.sleeperPlayerSchema, Object.values(raw));
    return { players: valid, invalid };
  },
  async values(format) {
    const { valid, invalid } = parseRows(fantasycalc.fantasyCalcRowSchema, await readFixture(`fantasycalc/${format}.json`));
    return { rows: valid.filter((r) => r.player.position !== "PICK" && r.player.sleeperId), invalid };
  },
  async trending(type) {
    return parseRows(sleeper.sleeperTrendingSchema, await readFixture(`sleeper/trending-${type}.json`)).valid;
  },
  async companies() {
    return seedCompanies();
  },
};
