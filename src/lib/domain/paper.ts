/**
 * Paper trading with fake credits. State lives in the browser (localStorage), validated with Zod.
 * After every trade, `tradeFeedback` explains what happened in market terms.
 */
import { z } from "zod";
import { formatPct } from "./market";

export const STARTING_CASH = 100_000;

export const tradeSchema = z.object({
  id: z.string(),
  side: z.enum(["buy", "sell"]),
  playerId: z.string(),
  name: z.string(),
  position: z.string().nullable(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  at: z.string(), // ISO timestamp
  realised: z.number().optional(), // sells only
});
export type Trade = z.output<typeof tradeSchema>;

export const positionSchema = z.object({
  playerId: z.string(),
  name: z.string(),
  position: z.string().nullable(),
  quantity: z.number().int().nonnegative(),
  costBasis: z.number().nonnegative(), // total credits paid for the shares still held
});
export type PaperPosition = z.output<typeof positionSchema>;

export const paperStateSchema = z.object({
  version: z.literal(1),
  cash: z.number(),
  positions: z.record(z.string(), positionSchema),
  trades: z.array(tradeSchema),
});
export type PaperState = z.output<typeof paperStateSchema>;

export function initialPaperState(): PaperState {
  return { version: 1, cash: STARTING_CASH, positions: {}, trades: [] };
}

export interface OrderInput {
  playerId: string;
  name: string;
  position: string | null;
  quantity: number;
  price: number;
  at?: string;
  id?: string;
}

export type OrderResult = { ok: true; state: PaperState; trade: Trade } | { ok: false; error: string };

export function buy(state: PaperState, o: OrderInput): OrderResult {
  if (!Number.isInteger(o.quantity) || o.quantity <= 0) return { ok: false, error: "Quantity must be a whole number above 0." };
  if (o.price <= 0) return { ok: false, error: "This player has no market price today." };
  const cost = o.price * o.quantity;
  if (cost > state.cash) {
    return { ok: false, error: `Not enough credits: this order costs ${Math.round(cost).toLocaleString("en-US")}, you have ${Math.round(state.cash).toLocaleString("en-US")}.` };
  }
  const prev = state.positions[o.playerId];
  const trade: Trade = {
    id: o.id ?? cryptoId(),
    side: "buy",
    playerId: o.playerId,
    name: o.name,
    position: o.position,
    quantity: o.quantity,
    price: o.price,
    at: o.at ?? new Date().toISOString(),
  };
  return {
    ok: true,
    trade,
    state: {
      ...state,
      cash: state.cash - cost,
      positions: {
        ...state.positions,
        [o.playerId]: {
          playerId: o.playerId,
          name: o.name,
          position: o.position,
          quantity: (prev?.quantity ?? 0) + o.quantity,
          costBasis: (prev?.costBasis ?? 0) + cost,
        },
      },
      trades: [...state.trades, trade],
    },
  };
}

export function sell(state: PaperState, o: OrderInput): OrderResult {
  const prev = state.positions[o.playerId];
  if (!Number.isInteger(o.quantity) || o.quantity <= 0) return { ok: false, error: "Quantity must be a whole number above 0." };
  if (!prev || prev.quantity < o.quantity) {
    return { ok: false, error: `You can only sell shares you own (you own ${prev?.quantity ?? 0}).` };
  }
  const avgCost = prev.costBasis / prev.quantity;
  const proceeds = o.price * o.quantity;
  const realised = (o.price - avgCost) * o.quantity;
  const remaining = prev.quantity - o.quantity;
  const positions = { ...state.positions };
  if (remaining === 0) delete positions[o.playerId];
  else positions[o.playerId] = { ...prev, quantity: remaining, costBasis: avgCost * remaining };
  const trade: Trade = {
    id: o.id ?? cryptoId(),
    side: "sell",
    playerId: o.playerId,
    name: o.name,
    position: o.position,
    quantity: o.quantity,
    price: o.price,
    at: o.at ?? new Date().toISOString(),
    realised,
  };
  return { ok: true, trade, state: { ...state, cash: state.cash + proceeds, positions, trades: [...state.trades, trade] } };
}

export function realisedTotal(state: PaperState): number {
  return state.trades.reduce((s, t) => s + (t.realised ?? 0), 0);
}

/** Load from untrusted storage: anything invalid resets to a fresh state. */
export function parsePaperState(raw: string | null): PaperState {
  if (!raw) return initialPaperState();
  try {
    const r = paperStateSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : initialPaperState();
  } catch {
    return initialPaperState();
  }
}

function cryptoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// ---------- feedback ----------

export interface TradeContext {
  /** % change over the last 30 days (our history, or FantasyCalc's trend). */
  change30Pct: number | null;
  injuryStatus: string | null;
  /** Share (0..1) of the paper portfolio's invested value in this player's position after the trade. */
  positionShareAfter: number | null;
  position: string | null;
}

export interface Feedback {
  tone: "info" | "caution" | "good";
  title: string;
  body: string;
  term: string; // glossary id
}

/** Explain a trade in market terms. Pure and deterministic, so it is unit tested. */
export function tradeFeedback(trade: Trade, ctx: TradeContext): Feedback[] {
  const out: Feedback[] = [];
  const c = ctx.change30Pct;
  if (trade.side === "buy") {
    if (c !== null && c >= 10) {
      out.push({
        tone: "caution",
        title: "You bought after a big rise",
        body: `${trade.name} is ${formatPct(c)} over 30 days. Buying right after a spike is called "buying high": prices often cool off after a fast run-up, though sometimes the rise continues.`,
        term: "buy-high-sell-low",
      });
    } else if (c !== null && c <= -10) {
      out.push({
        tone: "info",
        title: "You bought after a fall",
        body: `${trade.name} is ${formatPct(c)} over 30 days. Buying after a drop can be a bargain, or the price can keep falling. Ask why it dropped.`,
        term: "buy-high-sell-low",
      });
    }
    if (ctx.injuryStatus) {
      out.push({
        tone: "caution",
        title: "News risk",
        body: `${trade.name} is listed as "${ctx.injuryStatus}". News like an injury can move a price fast. That is a big part of volatility.`,
        term: "volatility",
      });
    }
    if (ctx.positionShareAfter !== null && ctx.positionShareAfter >= 0.5 && ctx.position) {
      out.push({
        tone: "caution",
        title: "Your portfolio is concentrated",
        body: `${Math.round(ctx.positionShareAfter * 100)}% of your invested credits are now in ${ctx.position}s. If that position has a bad week, most of your portfolio drops together. Spreading across positions is called diversification.`,
        term: "diversification",
      });
    }
  } else {
    const r = trade.realised ?? 0;
    if (c !== null && c <= -10 && r < 0) {
      out.push({
        tone: "caution",
        title: "You sold after a drop",
        body: `${trade.name} is ${formatPct(c)} over 30 days and you sold at a loss. Selling after a fall is called "selling low". Ask whether the bad news changes the long-term value.`,
        term: "buy-high-sell-low",
      });
    }
    out.push({
      tone: r >= 0 ? "good" : "info",
      title: r >= 0 ? "Realised gain" : "Realised loss",
      body: `Selling locked in a ${r >= 0 ? "gain" : "loss"} of ${Math.abs(Math.round(r)).toLocaleString("en-US")} credits. Before you sell, a gain or loss is only "unrealised": it exists on paper.`,
      term: "realised-gain",
    });
  }
  if (out.length === 0) {
    out.push({
      tone: "info",
      title: "Order filled",
      body: `You ${trade.side === "buy" ? "bought" : "sold"} ${trade.quantity} share${trade.quantity === 1 ? "" : "s"} of ${trade.name} at today's price. This was a market order: it fills straight away at the current price.`,
      term: "market-order",
    });
  }
  return out;
}
