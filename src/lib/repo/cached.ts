/**
 * Cached reads for Server Components (Next.js Cache Components). Market data changes once a day,
 * so an hour of caching is safe; the snapshot route also expires the "market" tag after a run.
 */
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "../db/client";
import type { ValueFormat } from "../sources/fantasycalc";
import * as repo from "./market";

export async function cachedMarket(format: ValueFormat) {
  "use cache";
  cacheLife("hours");
  cacheTag("market");
  return repo.getMarket(await getDb(), format);
}

export async function cachedPlayer(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("market");
  return repo.getPlayerDetail(await getDb(), id);
}

export async function cachedCompanies() {
  "use cache";
  cacheLife("hours");
  cacheTag("market");
  return repo.getCompanies(await getDb());
}
