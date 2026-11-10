/**
 * Run migrations and the daily snapshot from the command line.
 *   npm run snapshot              live APIs (Sleeper, FantasyCalc, SEC if SEC_USER_AGENT is set)
 *   npm run db:seed               recorded fixtures (offline; used by CI and e2e)
 * Options: --fixtures, --date=YYYY-MM-DD, --migrate-only
 *
 * With the embedded PGlite database, stop `npm run dev` first (one process per data dir).
 */
import "dotenv/config";
import { getDb, migrateDb } from "../src/lib/db/client";
import { fixtureSources, liveSources } from "../src/lib/jobs/market-sources";
import { runSnapshot } from "../src/lib/jobs/snapshot";

async function main() {
  const args = process.argv.slice(2);
  const db = await getDb();
  await migrateDb(db);
  console.log(`migrations applied (${process.env.DATABASE_URL ? "postgres" : "pglite"})`);
  if (args.includes("--migrate-only")) return;

  const date = args.find((a) => a.startsWith("--date="))?.slice(7);
  const sources = args.includes("--fixtures") ? fixtureSources : liveSources;
  const result = await runSnapshot(db, sources, { date, forcePlayers: args.includes("--fixtures") });
  console.log(`snapshot (${sources.name}) for ${result.date}:`, result.counts);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
