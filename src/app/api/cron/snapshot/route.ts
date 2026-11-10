/**
 * Daily snapshot, called by Vercel Cron (see vercel.json). Vercel sends
 * "Authorization: Bearer $CRON_SECRET"; anything else is rejected.
 */
import { revalidateTag } from "next/cache";
import { getDb, migrateDb } from "@/lib/db/client";
import { liveSources } from "@/lib/jobs/market-sources";
import { runSnapshot } from "@/lib/jobs/snapshot";

export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  await migrateDb(db);
  try {
    const result = await runSnapshot(db, liveSources);
    revalidateTag("market", "max");
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
