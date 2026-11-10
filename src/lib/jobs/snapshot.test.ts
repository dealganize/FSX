import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createPgliteDb, migrateDb, type Db } from "../db/client";
import { ingestRuns, players, trendingSnapshots, valueSnapshots } from "../db/schema";
import { fixtureSources } from "./market-sources";
import {
  addDays,
  derivedStartRows,
  runSnapshot,
  saneCompanyValue,
  toTrendingRows,
  toValueRows,
} from "./snapshot";

describe("pure transforms", () => {
  it("addDays crosses month boundaries in UTC", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-11-10", -30)).toBe("2026-10-11");
  });

  it("toValueRows keeps the first row per Sleeper id and rounds values", () => {
    const row = (id: string, value: number) => ({
      player: { id: 1, name: "X", sleeperId: id, position: "RB", maybeTeam: "DET", maybeAge: 24 },
      value,
      overallRank: 1,
      positionRank: 1,
      trend30Day: 10.4,
    });
    const out = toValueRows([row("1", 100.6), row("1", 50), row("2", 70)], "dynasty", "2026-11-10");
    expect(out.map((r) => [r.playerId, r.value, r.trend30Day])).toEqual([
      ["1", 101, 10],
      ["2", 70, 10],
    ]);
  });

  it("derivedStartRows only adds one labelled point for players without history", () => {
    const today = toValueRows(
      [
        {
          player: { id: 1, name: "A", sleeperId: "a", position: "WR" },
          value: 5000,
          overallRank: 10,
          positionRank: 3,
          trend30Day: 400,
        },
        {
          player: { id: 2, name: "B", sleeperId: "b", position: "WR" },
          value: 3000,
          overallRank: 20,
          positionRank: 8,
          trend30Day: -200,
        },
      ],
      "dynasty",
      "2026-11-10",
    );
    const derived = derivedStartRows(today, new Set(["b"]));
    expect(derived).toHaveLength(1);
    expect(derived[0]).toMatchObject({ playerId: "a", date: "2026-10-11", value: 4600, derived: true });
  });

  it("toTrendingRows merges adds and drops per player", () => {
    const rows = toTrendingRows(
      [{ player_id: "1", count: 50 }],
      [
        { player_id: "1", count: 5 },
        { player_id: "2", count: 9 },
      ],
      "2026-11-10",
    );
    expect(rows).toEqual([
      { sport: "nfl", playerId: "1", date: "2026-11-10", adds: 50, drops: 5 },
      { sport: "nfl", playerId: "2", date: "2026-11-10", adds: 0, drops: 9 },
    ]);
  });

  it("saneCompanyValue rejects zero and 10x jumps", () => {
    expect(saneCompanyValue(100, undefined)).toBe(true);
    expect(saneCompanyValue(0, undefined)).toBe(false);
    expect(saneCompanyValue(1001, 100)).toBe(false);
    expect(saneCompanyValue(500, 100)).toBe(true);
  });
});

describe("runSnapshot against PGlite with recorded fixtures", () => {
  let db: Db;
  beforeAll(async () => {
    db = await createPgliteDb("memory://");
    await migrateDb(db, "");
  });

  it("loads players, values, derived start points and trending", async () => {
    const { counts } = await runSnapshot(db, fixtureSources, { date: "2026-11-10", forcePlayers: true });
    expect(counts.players).toBeGreaterThan(300);
    expect(counts.values_dynasty).toBeGreaterThan(300);
    expect(counts.values_dynasty_derived).toBe(counts.values_dynasty);
    expect(counts.trending).toBeGreaterThan(50);
    expect(counts.companies).toBe(54);

    const gibbsDays = await db
      .select()
      .from(valueSnapshots)
      .where(and(eq(valueSnapshots.playerId, "9221"), eq(valueSnapshots.format, "dynasty")));
    expect(gibbsDays.map((d) => d.date).sort()).toEqual(["2026-10-11", "2026-11-10"]);
  });

  it("a second day adds a real point and no new derived points", async () => {
    const { counts } = await runSnapshot(db, fixtureSources, { date: "2026-11-11" });
    expect(counts.values_dynasty_derived).toBe(0);
    expect(counts.players).toBeUndefined(); // players refreshed < 24h ago: skipped
    const rows = await db.select().from(valueSnapshots).where(eq(valueSnapshots.playerId, "9221"));
    expect(rows.filter((r) => r.format === "dynasty")).toHaveLength(3);
    const runs = await db.select().from(ingestRuns);
    expect(runs.every((r) => r.status === "ok")).toBe(true);
    expect((await db.select().from(players)).length).toBeGreaterThan(300);
    expect((await db.select().from(trendingSnapshots)).length).toBeGreaterThan(100);
  });
});
