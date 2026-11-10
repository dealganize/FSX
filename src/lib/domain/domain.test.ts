import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  changeOver,
  dailyChange,
  formatPct,
  moveSize,
  trendChange,
  volatility,
  volatilityBand,
  type PricePoint,
} from "./market";
import { diversification, portfolioValue, unrealisedGain, type Holding } from "./portfolio";
import { investingStyle, matchCompany, percentileOf, topPercentText } from "./match";
import { buy, initialPaperState, parsePaperState, sell, STARTING_CASH, tradeFeedback } from "./paper";
import { orderHistory } from "./activity";
import { parseRows } from "../sources/http";
import { sleeperRosterSchema, sleeperTransactionSchema } from "../sources/sleeper";

const s = (pairs: [string, number, boolean?][]): PricePoint[] =>
  pairs.map(([date, value, derived]) => ({ date, value, derived }));

describe("market", () => {
  it("dailyChange ignores the derived start point", () => {
    expect(dailyChange(s([["2026-10-11", 900, true], ["2026-11-10", 1000]]))).toBeNull();
    const c = dailyChange(s([["2026-10-11", 900, true], ["2026-11-09", 1000], ["2026-11-10", 1100]]));
    expect(c).toMatchObject({ abs: 100, fromDate: "2026-11-09" });
    expect(c!.pct).toBeCloseTo(10);
  });

  it("changeOver uses the newest point at or before the cutoff", () => {
    const series = s([["2026-10-11", 800, true], ["2026-11-01", 900], ["2026-11-10", 1000]]);
    expect(changeOver(series, 30)?.abs).toBe(200);
    expect(changeOver(series, 7)?.fromDate).toBe("2026-11-01"); // cutoff 11-03 → 11-01 is the newest point ≤ cutoff
    expect(changeOver(series, 20)?.fromDate).toBe("2026-10-11"); // cutoff 10-21 → only the derived point qualifies
    expect(changeOver(s([["2026-11-10", 1]]), 7)).toBeNull();
  });

  it("trendChange converts FantasyCalc's 30-day trend to a %", () => {
    expect(trendChange(1100, 100)!.pct).toBeCloseTo(10);
    expect(trendChange(1000, null)).toBeNull();
  });

  it("volatility needs 7 real points and measures daily swings", () => {
    const short = s(Array.from({ length: 6 }, (_, i) => [`2026-11-0${i + 1}`, 1000] as [string, number]));
    expect(volatility(short)).toBeNull();
    const flat = s(Array.from({ length: 8 }, (_, i) => [`2026-11-0${i + 1}`, 1000] as [string, number]));
    expect(volatility(flat)).toBe(0);
    const jumpy = s([
      ["2026-11-01", 1000], ["2026-11-02", 1100], ["2026-11-03", 1000], ["2026-11-04", 1100],
      ["2026-11-05", 1000], ["2026-11-06", 1100], ["2026-11-07", 1000],
    ]);
    expect(volatilityBand(volatility(jumpy)!)).toBe("jumpy");
  });

  it("formats and sizes moves", () => {
    expect(formatPct(4.26)).toBe("+4.3%");
    expect(formatPct(-12)).toBe("-12.0%");
    expect(moveSize(0.5)).toBe("flat");
    expect(moveSize(-30)).toBe("huge");
  });
});

describe("portfolio", () => {
  const h = (playerId: string, position: string, price: number | null, quantity = 1, costBasis?: number): Holding => ({
    playerId, name: playerId, position, price, quantity, costBasis,
  });

  it("values holdings and skips players without a price", () => {
    expect(portfolioValue([h("a", "RB", 100, 2), h("b", "WR", null)])).toBe(200);
  });

  it("flags concentration when one position is half or more", () => {
    const d = diversification([h("a", "RB", 600), h("b", "WR", 300), h("c", "QB", 100)]);
    expect(d.top).toMatchObject({ position: "RB", share: 0.6 });
    expect(d.level).toBe("concentrated");
    expect(d.hhi).toBeCloseTo(0.36 + 0.09 + 0.01);
    expect(diversification([h("a", "RB", 30), h("b", "WR", 30), h("c", "QB", 20), h("d", "TE", 20)]).level).toBe("diversified");
  });

  it("computes unrealised gain from cost basis", () => {
    expect(unrealisedGain(h("a", "RB", 120, 10, 1000))).toEqual({ abs: 200, pct: 20 });
  });
});

describe("Player ⇄ Stock match", () => {
  const companies = [
    { ticker: "S", name: "Small", valueUsd: 1e9, asOf: "2025-06-30" },
    { ticker: "B", name: "Big", valueUsd: 3e12, asOf: "2025-06-30" },
    { ticker: "M", name: "Mid", valueUsd: 1e11, asOf: "2025-06-30" },
  ];

  it("matches by percentile regardless of input order", () => {
    expect(matchCompany(1, 400, companies)!.company.ticker).toBe("B");
    expect(matchCompany(200, 399, companies)!.company.ticker).toBe("M");
    expect(matchCompany(400, 400, companies)!.company.ticker).toBe("S");
    expect(matchCompany(1, 400, [])).toBeNull();
  });

  it("describes percentiles in plain words", () => {
    expect(percentileOf(1, 100)).toBe(0);
    expect(topPercentText(0)).toBe("top 1%");
    expect(topPercentText(0.1)).toBe("top 10%");
    expect(topPercentText(0.9)).toBe("bottom 10%");
  });

  it("labels investing styles", () => {
    expect(investingStyle({ age: 22, overallRank: 40, trend30Pct: 8, injuryStatus: null })).toBe("growth");
    expect(investingStyle({ age: 28, overallRank: 5, trend30Pct: 1, injuryStatus: null })).toBe("blue-chip");
    expect(investingStyle({ age: 28, overallRank: 5, trend30Pct: 1, injuryStatus: "IR" })).toBe("high-risk");
    expect(investingStyle({ age: 30, overallRank: 150, trend30Pct: -20, injuryStatus: null })).toBe("high-risk");
    expect(investingStyle({ age: 30, overallRank: 150, trend30Pct: 0, injuryStatus: null })).toBe("steady");
  });
});

describe("paper trading", () => {
  const order = { playerId: "9221", name: "Jahmyr Gibbs", position: "RB", at: "2026-11-10T10:00:00Z" };

  it("buys, tracks cost basis, sells with realised gain", () => {
    const b = buy(initialPaperState(), { ...order, quantity: 2, price: 10_000, id: "t1" });
    expect(b.ok && b.state.cash).toBe(STARTING_CASH - 20_000);
    if (!b.ok) throw new Error();
    const s1 = sell(b.state, { ...order, quantity: 1, price: 11_000, id: "t2" });
    if (!s1.ok) throw new Error(s1.error);
    expect(s1.trade.realised).toBe(1_000);
    expect(s1.state.positions["9221"]).toMatchObject({ quantity: 1, costBasis: 10_000 });
    expect(s1.state.cash).toBe(STARTING_CASH - 20_000 + 11_000);
  });

  it("rejects orders it cannot fill", () => {
    expect(buy(initialPaperState(), { ...order, quantity: 11, price: 10_000 }).ok).toBe(false);
    expect(buy(initialPaperState(), { ...order, quantity: 1.5, price: 10 }).ok).toBe(false);
    expect(sell(initialPaperState(), { ...order, quantity: 1, price: 10 }).ok).toBe(false);
  });

  it("parsePaperState resets on corrupt or foreign data", () => {
    expect(parsePaperState("{not json").cash).toBe(STARTING_CASH);
    expect(parsePaperState(JSON.stringify({ version: 1, cash: "lots" })).cash).toBe(STARTING_CASH);
    const valid = buy(initialPaperState(), { ...order, quantity: 1, price: 5 });
    if (!valid.ok) throw new Error();
    expect(parsePaperState(JSON.stringify(valid.state)).cash).toBe(STARTING_CASH - 5);
  });

  it("explains buying high, injuries and concentration", () => {
    const b = buy(initialPaperState(), { ...order, quantity: 1, price: 10_000 });
    if (!b.ok) throw new Error();
    const fb = tradeFeedback(b.trade, { change30Pct: 18, injuryStatus: "Questionable", positionShareAfter: 1, position: "RB" });
    expect(fb.map((f) => f.term)).toEqual(["buy-high-sell-low", "volatility", "diversification"]);
    expect(fb[0]!.body).toContain("+18.0%");
  });

  it("explains selling low and realised losses", () => {
    const b = buy(initialPaperState(), { ...order, quantity: 1, price: 10_000 });
    if (!b.ok) throw new Error();
    const s2 = sell(b.state, { ...order, quantity: 1, price: 8_000 });
    if (!s2.ok) throw new Error();
    const fb = tradeFeedback(s2.trade, { change30Pct: -20, injuryStatus: null, positionShareAfter: null, position: "RB" });
    expect(fb.map((f) => f.title)).toEqual(["You sold after a drop", "Realised loss"]);
  });

  it("gives a plain market-order note when nothing stands out", () => {
    const b = buy(initialPaperState(), { ...order, quantity: 1, price: 100 });
    if (!b.ok) throw new Error();
    expect(tradeFeedback(b.trade, { change30Pct: 2, injuryStatus: null, positionShareAfter: 0.3, position: "RB" })[0]!.term).toBe("market-order");
  });
});

describe("order history from recorded Sleeper transactions", () => {
  const dir = path.join(process.cwd(), "fixtures", "sleeper");
  const leagueId = "1386714884397355008";
  const user = JSON.parse(readFileSync(path.join(dir, "user-johnrog.json"), "utf8")) as { user_id: string };
  const rosters = parseRows(sleeperRosterSchema, JSON.parse(readFileSync(path.join(dir, `rosters-${leagueId}.json`), "utf8"))).valid;
  const txs = parseRows(sleeperTransactionSchema, JSON.parse(readFileSync(path.join(dir, `transactions-${leagueId}.json`), "utf8"))).valid;
  const mine = rosters.find((r) => r.owner_id === user.user_id);

  it("finds johnrog's roster and only his legs of each move", () => {
    expect(mine).toBeDefined();
    const items = orderHistory(txs, mine!.roster_id, () => 100);
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      expect(i.bought.length + i.sold.length).toBeGreaterThan(0);
      expect(i.netValue).toBe(i.boughtValue - i.soldValue);
    }
    const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt);
    expect(items).toEqual(sorted);
  });
});
