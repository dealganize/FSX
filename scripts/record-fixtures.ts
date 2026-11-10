/**
 * Records real API responses into fixtures/ so tests and the offline seed never hit the network.
 * Run rarely (it calls Sleeper ~50 times, FantasyCalc twice, SEC ~55 times, spaced out).
 *
 *   npm run fixtures:record
 *
 * The Sleeper player dump (~5 MB) is trimmed to players that matter for the fixtures.
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchJson } from "../src/lib/sources/http";
import { SLEEPER_BASE } from "../src/lib/sources/sleeper";
import { fantasyCalcUrl } from "../src/lib/sources/fantasycalc";
import { COMPANIES } from "../src/data/companies";
import { getPublicFloat } from "../src/lib/sources/sec";

const OUT = path.join(process.cwd(), "fixtures");
const USERNAME = process.env.NEXT_PUBLIC_DEMO_SLEEPER_USER || "johnrog";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function save(rel: string, data: unknown) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 1) + "\n");
  console.log("saved", rel);
}

async function sleeper(p: string) {
  await sleep(120); // far below Sleeper's 1000 calls/min guidance
  return fetchJson(`${SLEEPER_BASE}${p}`, { source: "sleeper", timeoutMs: 60_000 });
}

async function main() {
  const state = (await sleeper("/state/nfl")) as { season: string; week: number };
  await save("sleeper/state.json", state);

  const user = (await sleeper(`/user/${USERNAME}`)) as { user_id: string };
  await save(`sleeper/user-${USERNAME}.json`, user);

  const leagues = (await sleeper(`/user/${user.user_id}/leagues/nfl/${state.season}`)) as { league_id: string }[];
  await save(`sleeper/leagues-${state.season}.json`, leagues);

  const keepIds = new Set<string>();
  for (const l of leagues) {
    const rosters = (await sleeper(`/league/${l.league_id}/rosters`)) as { players?: string[] | null }[];
    rosters.forEach((r) => r.players?.forEach((id) => keepIds.add(id)));
    await save(`sleeper/rosters-${l.league_id}.json`, rosters);
    await save(`sleeper/users-${l.league_id}.json`, await sleeper(`/league/${l.league_id}/users`));
    const txs: unknown[] = [];
    for (let week = 1; week <= Math.max(1, state.week); week++) {
      const t = (await sleeper(`/league/${l.league_id}/transactions/${week}`)) as {
        adds?: Record<string, number> | null;
        drops?: Record<string, number> | null;
      }[];
      t.forEach((x) => [...Object.keys(x.adds ?? {}), ...Object.keys(x.drops ?? {})].forEach((id) => keepIds.add(id)));
      txs.push(...t);
    }
    await save(`sleeper/transactions-${l.league_id}.json`, txs);
  }

  for (const type of ["add", "drop"] as const) {
    const t = (await sleeper(`/players/nfl/trending/${type}?lookback_hours=24&limit=200`)) as { player_id: string }[];
    t.forEach((x) => keepIds.add(x.player_id));
    await save(`sleeper/trending-${type}.json`, t);
  }

  for (const format of ["dynasty", "redraft"] as const) {
    const rows = (await fetchJson(fantasyCalcUrl(format), { source: "fantasycalc", timeoutMs: 30_000 })) as {
      player: { sleeperId?: string | null };
    }[];
    rows.forEach((r) => r.player.sleeperId && keepIds.add(r.player.sleeperId));
    await save(`fantasycalc/${format}.json`, rows);
    await sleep(500);
  }

  const all = (await sleeper("/players/nfl")) as Record<string, unknown>;
  const trimmed = Object.fromEntries(Object.entries(all).filter(([id]) => keepIds.has(id)));
  await save("sleeper/players-nfl.trimmed.json", trimmed);
  console.log(`players kept: ${Object.keys(trimmed).length} of ${Object.keys(all).length}`);

  const ua = process.env.SEC_USER_AGENT;
  if (!ua) {
    console.log("SEC_USER_AGENT not set: skipping company values");
    return;
  }
  const values = [];
  for (const c of COMPANIES) {
    await sleep(200); // SEC fair access: max 10 requests/second
    try {
      const pf = await getPublicFloat(c.cik, ua);
      values.push({ ticker: c.ticker, cik: c.cik, name: c.name, valueUsd: pf.valueUsd, asOf: pf.asOf, form: pf.form });
    } catch (e) {
      console.warn("skip", c.ticker, (e as Error).message);
    }
  }
  await save("../src/data/company-values.seed.json", {
    source: "SEC EDGAR XBRL API, dei:EntityPublicFloat",
    fetchedAt: new Date().toISOString().slice(0, 10),
    companies: values,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
