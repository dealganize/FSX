/**
 * Tutor tools. They only read FSX's own data; every number the tutor states must come from
 * one of these results (checked by evals/). Inputs are validated with Zod before running.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { GLOSSARY } from "@/content/glossary";
import { LESSONS } from "@/content/lessons";
import { round, volatilityBand } from "@/lib/domain/market";
import { investingStyle, matchCompany, STYLE_COPY, topPercentText } from "@/lib/domain/match";
import type { MarketData, MarketRow, PlayerDetail } from "@/lib/repo/market";
import type { PortfolioResult } from "@/lib/repo/sleeper-portfolio";
import type { ValueFormat } from "@/lib/sources/fantasycalc";

/** Data access the tools need. The API route and the evals provide implementations. */
export interface TutorData {
  market(format: ValueFormat): Promise<MarketData>;
  player(id: string): Promise<PlayerDetail | null>;
  search(query: string): Promise<{ id: string; name: string; position: string | null; team: string | null }[]>;
  companies(): Promise<{ ticker: string; name: string; valueUsd: number; asOf: string }[]>;
  sleeperPortfolio(username: string, leagueId?: string): Promise<PortfolioResult>;
}

const format = z.enum(["dynasty", "redraft"]).default("dynasty");

const inputs = {
  search_players: z.object({ query: z.string().min(2).max(60) }),
  get_player: z.object({ player_id: z.string().max(20), format }),
  get_price_history: z.object({ player_id: z.string().max(20), format, days: z.number().int().min(1).max(365).default(30) }),
  get_market_movers: z.object({
    kind: z.enum(["gainers_30d", "losers_30d", "most_added", "most_dropped", "most_valuable"]),
    position: z.enum(["QB", "RB", "WR", "TE"]).optional(),
    limit: z.number().int().min(1).max(10).default(5),
    format,
  }),
  get_sleeper_portfolio: z.object({ username: z.string().max(30), league_id: z.string().max(30).optional() }),
  get_stock_match: z.object({ player_id: z.string().max(20), format }),
  get_glossary_term: z.object({ term: z.string().max(60) }),
  get_lesson: z.object({ lesson_id: z.string().max(40) }),
} as const;

export type ToolName = keyof typeof inputs;

const formatProp = { type: "string", enum: ["dynasty", "redraft"], description: "Value format. Default dynasty." } as const;

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "search_players",
    description: "Find NFL players by (part of) name. Returns ids to use with other tools.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "get_player",
    description:
      "Today's market data for one player: value (the 'price'), rank, 1-day and 30-day change, volume (Sleeper adds/drops in 24h), injury status, age, volatility if enough history.",
    input_schema: { type: "object", properties: { player_id: { type: "string" }, format: formatProp }, required: ["player_id"] },
  },
  {
    name: "get_price_history",
    description: "Daily value snapshots for one player. Points marked derived=true come from FantasyCalc's 30-day trend, not a stored snapshot.",
    input_schema: {
      type: "object",
      properties: { player_id: { type: "string" }, format: formatProp, days: { type: "integer", description: "Look-back window, default 30" } },
      required: ["player_id"],
    },
  },
  {
    name: "get_market_movers",
    description: "Top players by a measure: biggest 30-day gainers or losers (%), most added or dropped on Sleeper in 24h (volume), or most valuable.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["gainers_30d", "losers_30d", "most_added", "most_dropped", "most_valuable"] },
        position: { type: "string", enum: ["QB", "RB", "WR", "TE"] },
        limit: { type: "integer" },
        format: formatProp,
      },
      required: ["kind"],
    },
  },
  {
    name: "get_sleeper_portfolio",
    description: "A Sleeper user's real roster valued as a portfolio: total value, top holdings, and value share by position (diversification).",
    input_schema: {
      type: "object",
      properties: { username: { type: "string" }, league_id: { type: "string" } },
      required: ["username"],
    },
  },
  {
    name: "get_stock_match",
    description: "The FSX 'Player ⇄ Stock' analogy: the real company at the same value percentile (by SEC-reported public float), plus an investing-style label.",
    input_schema: { type: "object", properties: { player_id: { type: "string" }, format: formatProp }, required: ["player_id"] },
  },
  {
    name: "get_glossary_term",
    description: "FSX glossary entry: plain meaning, stock-market meaning and fantasy-football meaning of a term.",
    input_schema: { type: "object", properties: { term: { type: "string" } }, required: ["term"] },
  },
  {
    name: "get_lesson",
    description: "Summary of an FSX lesson by id (price, change, volume, volatility, diversification).",
    input_schema: { type: "object", properties: { lesson_id: { type: "string" } }, required: ["lesson_id"] },
  },
];

const pct = (n: number | null | undefined) => (n === null || n === undefined ? null : round(n, 1));

function rowSummary(r: MarketRow) {
  return {
    player_id: r.id,
    name: r.name,
    position: r.position,
    team: r.team,
    value: r.value,
    rank: r.rank,
    change_30d_pct: pct(r.change30Pct),
    adds_24h: r.adds,
    drops_24h: r.drops,
  };
}

export async function runTool(name: string, rawInput: unknown, data: TutorData): Promise<{ content: string; isError: boolean }> {
  const schema = inputs[name as ToolName];
  if (!schema) return { content: JSON.stringify({ error: `Unknown tool ${name}` }), isError: true };
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) return { content: JSON.stringify({ error: "Invalid input", details: z.prettifyError(parsed.error) }), isError: true };
  try {
    const result = await execute(name as ToolName, parsed.data as never, data);
    return { content: JSON.stringify(result), isError: false };
  } catch (e) {
    return { content: JSON.stringify({ error: (e as Error).message }), isError: true };
  }
}

async function execute<N extends ToolName>(name: N, input: z.output<(typeof inputs)[N]>, data: TutorData): Promise<unknown> {
  switch (name) {
    case "search_players": {
      const i = input as z.output<typeof inputs.search_players>;
      const found = await data.search(i.query);
      return found.length ? { players: found.slice(0, 8) } : { players: [], note: "No player matched." };
    }
    case "get_player": {
      const i = input as z.output<typeof inputs.get_player>;
      const market = await data.market(i.format);
      const row = market.rows.find((r) => r.id === i.player_id);
      const detail = await data.player(i.player_id);
      if (!detail) return { error: "No such player." };
      const vol = detail.volatilityPct[i.format];
      return {
        name: detail.player.name,
        position: detail.player.position,
        team: detail.player.team,
        age: detail.player.age,
        years_experience: detail.player.yearsExp,
        injury_status: detail.player.injuryStatus,
        format: i.format,
        as_of: market.asOf,
        listed_in_market: Boolean(row),
        value: row?.value ?? null,
        rank: row?.rank ?? null,
        players_in_market: market.rows.length,
        change_1d: row?.change1d ? { abs: row.change1d.abs, pct: pct(row.change1d.pct) } : null,
        change_30d: row ? { abs: row.change30Abs, pct: pct(row.change30Pct), source: row.change30Source } : null,
        adds_24h: row?.adds ?? 0,
        drops_24h: row?.drops ?? 0,
        volatility_daily_pct: vol === null ? null : round(vol, 2),
        volatility_band: vol === null ? null : volatilityBand(vol),
        history_days_stored: market.historyDays,
      };
    }
    case "get_price_history": {
      const i = input as z.output<typeof inputs.get_price_history>;
      const detail = await data.player(i.player_id);
      if (!detail) return { error: "No such player." };
      const series = detail.history[i.format];
      const last = series[series.length - 1];
      if (!last) return { name: detail.player.name, points: [], note: "No history yet." };
      const from = new Date(`${last.date}T00:00:00Z`);
      from.setUTCDate(from.getUTCDate() - i.days);
      const cutoff = from.toISOString().slice(0, 10);
      return {
        name: detail.player.name,
        format: i.format,
        points: series.filter((p) => p.date >= cutoff).map((p) => ({ date: p.date, value: p.value, derived: Boolean(p.derived) })),
      };
    }
    case "get_market_movers": {
      const i = input as z.output<typeof inputs.get_market_movers>;
      const market = await data.market(i.format);
      let rows = market.rows.filter((r) => !i.position || r.position === i.position);
      const movers = rows.filter((r) => r.change30Pct !== null && r.value >= 1500);
      switch (i.kind) {
        case "gainers_30d": rows = movers.sort((a, b) => b.change30Pct! - a.change30Pct!); break;
        case "losers_30d": rows = movers.sort((a, b) => a.change30Pct! - b.change30Pct!); break;
        case "most_added": rows = [...rows].sort((a, b) => b.adds - a.adds); break;
        case "most_dropped": rows = [...rows].sort((a, b) => b.drops - a.drops); break;
        case "most_valuable": rows = [...rows].sort((a, b) => b.value - a.value); break;
      }
      return {
        kind: i.kind,
        format: i.format,
        as_of: market.asOf,
        note: i.kind.endsWith("30d") ? "Only players worth 1,500+ are included, so tiny values don't dominate % moves." : undefined,
        players: rows.slice(0, i.limit).map(rowSummary),
      };
    }
    case "get_sleeper_portfolio": {
      const i = input as z.output<typeof inputs.get_sleeper_portfolio>;
      const r = await data.sleeperPortfolio(i.username, i.league_id);
      if (!r.ok) return { error: r.message };
      const p = r.portfolio;
      return {
        username: p.username,
        league: p.league.name,
        value_format: p.format,
        other_leagues: p.leagues.filter((l) => l.id !== p.league.id).map((l) => ({ id: l.id, name: l.name })),
        total_value: Math.round(p.total),
        holdings_count: p.holdings.length,
        unpriced_holdings: p.unpriced,
        top_holdings: p.holdings.slice(0, 5).map((h) => ({ name: h.name, position: h.position, value: h.price, share_of_total_pct: h.price && p.total ? round((h.price / p.total) * 100, 1) : null })),
        by_position: p.diversification.slices.map((s) => ({ position: s.position, value: Math.round(s.value), share_pct: round(s.share * 100, 1), players: s.count })),
        diversification_level: p.diversification.level,
      };
    }
    case "get_stock_match": {
      const i = input as z.output<typeof inputs.get_stock_match>;
      const market = await data.market(i.format);
      const row = market.rows.find((r) => r.id === i.player_id);
      if (!row) return { error: "Player is not priced in this market today." };
      const m = matchCompany(row.rank, market.rows.length, await data.companies());
      if (!m) return { error: "No company data." };
      const style = investingStyle({ age: row.age, overallRank: row.rank, trend30Pct: row.change30Pct, injuryStatus: row.injuryStatus });
      return {
        player: row.name,
        player_rank: row.rank,
        players_in_market: market.rows.length,
        position_in_market: topPercentText(m.percentile),
        company: m.company.name,
        ticker: m.company.ticker,
        company_rank: m.companyRank,
        public_float_usd: m.company.valueUsd,
        public_float_as_of: m.company.asOf,
        public_float_meaning: "Market value in US dollars of the shares held by outside investors (not insiders), as reported to the SEC. A dollar amount, not a share count; close to but smaller than market capitalisation.",
        style: STYLE_COPY[style].label,
        style_meaning_fantasy: STYLE_COPY[style].fantasy,
        caveat: "An analogy by rank only. Not a view on the company as an investment.",
      };
    }
    case "get_glossary_term": {
      const i = input as z.output<typeof inputs.get_glossary_term>;
      const q = i.term.toLowerCase().trim();
      const t = GLOSSARY.find((g) => g.id === q || g.term.toLowerCase().includes(q) || q.includes(g.id.replace(/-/g, " ")));
      return t ? { term: t.term, plain: t.plain, stock_market: t.stock, fantasy_football: t.fantasy } : { error: "Not in the FSX glossary.", available: GLOSSARY.map((g) => g.id) };
    }
    case "get_lesson": {
      const i = input as z.output<typeof inputs.get_lesson>;
      const l = LESSONS.find((x) => x.id === i.lesson_id);
      return l
        ? { title: l.title, outcome: `After this lesson you can ${l.outcome}`, plain: l.plain, stock_market: l.stock, fantasy_football: l.fantasy, url: `/learn/${l.id}` }
        : { error: "No such lesson.", available: LESSONS.map((x) => x.id) };
    }
  }
}
