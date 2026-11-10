import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, migrateDb, type Db } from "../db/client";
import { fixtureSources } from "../jobs/market-sources";
import { runSnapshot } from "../jobs/snapshot";
import { liveExample } from "../domain/live-examples";
import { getCompanies, getMarket, getPlayerDetail, searchPlayers } from "./market";

describe("market repository on fixture data", () => {
  let db: Db;
  beforeAll(async () => {
    db = await createPgliteDb("memory://");
    await migrateDb(db, "");
    await runSnapshot(db, fixtureSources, { date: "2026-11-10", forcePlayers: true });
  });

  it("lists priced players ranked by value with FantasyCalc 30-day trend as change", async () => {
    const m = await getMarket(db, "dynasty");
    expect(m.asOf).toBe("2026-11-10");
    expect(m.historyDays).toBe(1);
    expect(m.rows.length).toBeGreaterThan(300);
    expect(m.rows[0]!.rank).toBe(1);
    expect(m.rows[0]!.value).toBeGreaterThanOrEqual(m.rows[1]!.value);
    const gibbs = m.rows.find((r) => r.id === "9221")!;
    expect(gibbs.change1d).toBeNull(); // only one real day so far
    expect(gibbs.change30Source).toBe("fantasycalc-trend");
    expect(gibbs.spark).toHaveLength(2); // derived start + today
  });

  it("redraft is a separate market", async () => {
    const d = await getMarket(db, "dynasty");
    const r = await getMarket(db, "redraft");
    expect(r.rows.length).toBeGreaterThan(100);
    expect(r.rows.length).not.toBe(d.rows.length);
  });

  it("player detail has history for both formats", async () => {
    const p = await getPlayerDetail(db, "9221");
    expect(p?.player.name).toBe("Jahmyr Gibbs");
    expect(p?.history.dynasty.map((x) => x.derived)).toEqual([true, false]);
    expect(p?.volatilityPct.dynasty).toBeNull();
    expect(await getPlayerDetail(db, "nope")).toBeNull();
  });

  it("search and companies work", async () => {
    expect((await searchPlayers(db, "gibbs")).some((p) => p.id === "9221")).toBe(true);
    const companies = await getCompanies(db);
    expect(companies[0]!.valueUsd).toBeGreaterThan(companies[companies.length - 1]!.valueUsd);
  });

  it("live examples produce sentences from real rows", async () => {
    const { rows } = await getMarket(db, "dynasty");
    expect(liveExample("top-value", rows)?.text).toMatch(/most valuable player is .+ at [\d,]+/);
    expect(liveExample("most-added", rows)?.text).toMatch(/added by [\d,]+ Sleeper managers/);
    expect(liveExample("position-mix", rows)?.text).toMatch(/Of the 50 most valuable/);
  });
});
