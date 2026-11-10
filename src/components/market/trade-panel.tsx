"use client";
/** Paper trading with practice credits, plus feedback that explains each trade in market terms. */
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Info, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Term } from "@/components/learn/term";
import { buy, sell, tradeFeedback, type Feedback } from "@/lib/domain/paper";
import { diversification } from "@/lib/domain/portfolio";
import { formatValue } from "@/lib/domain/market";
import { usePaper } from "@/lib/client/store";
import { cn } from "@/lib/utils";

export interface TradePlayer {
  id: string;
  name: string;
  position: string | null;
  price: number;
  change30Pct: number | null;
  injuryStatus: string | null;
}

export function TradePanel({ player, prices }: { player: TradePlayer; prices: Record<string, { value: number; position: string | null }> }) {
  const { state, save } = usePaper();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const owned = state.positions[player.id]?.quantity ?? 0;
  const n = Number(qty);
  const total = Number.isFinite(n) ? n * player.price : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const order = { playerId: player.id, name: player.name, position: player.position, quantity: n, price: player.price };
    const r = side === "buy" ? buy(state, order) : sell(state, order);
    if (!r.ok) {
      setError(r.error);
      setFeedback([]);
      return;
    }
    save(r.state);
    setError(null);
    const holdings = Object.values(r.state.positions).map((p) => ({
      playerId: p.playerId,
      name: p.name,
      position: p.position,
      quantity: p.quantity,
      price: prices[p.playerId]?.value ?? (p.playerId === player.id ? player.price : null),
    }));
    const d = diversification(holdings);
    const share = d.slices.find((s) => s.position === player.position)?.share ?? null;
    setFeedback(tradeFeedback(r.trade, { change30Pct: player.change30Pct, injuryStatus: player.injuryStatus, positionShareAfter: share, position: player.position }));
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Practice only: you trade with pretend credits. Nothing is real money, and nothing leaves your browser.
      </p>
      <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
        <TabsList className="w-full">
          <TabsTrigger value="buy">Buy</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
        </TabsList>
      </Tabs>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="qty">Shares</Label>
          <Input id="qty" type="number" inputMode="numeric" min={1} step={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <dl className="grid grid-cols-2 gap-1 text-sm">
          <dt className="text-muted-foreground">Price per share</dt>
          <dd className="text-right tabular-nums">{formatValue(player.price)}</dd>
          <dt className="text-muted-foreground">{side === "buy" ? "Total cost" : "You receive"}</dt>
          <dd className="text-right font-medium tabular-nums">{formatValue(total)}</dd>
          <dt className="text-muted-foreground">Your credits</dt>
          <dd className="text-right tabular-nums">{formatValue(state.cash)}</dd>
          <dt className="text-muted-foreground">You own</dt>
          <dd className="text-right tabular-nums">{owned}</dd>
        </dl>
        <p className="text-muted-foreground text-xs">
          This is a <Term id="market-order">market order</Term>: it fills straight away at today's price. Real brokers also offer{" "}
          <Term id="limit-order">limit orders</Term>, which only fill at a price you choose.
        </p>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full">
          {side === "buy" ? `Buy ${player.name}` : `Sell ${player.name}`}
        </Button>
      </form>
      {feedback.length > 0 && (
        <div className="space-y-2" role="status" aria-live="polite">
          <p className="text-sm font-semibold">What just happened</p>
          {feedback.map((f) => (
            <div
              key={f.title}
              className={cn(
                "flex gap-2 rounded-md border p-3 text-sm",
                f.tone === "caution" && "border-learn bg-accent/40",
                f.tone === "good" && "border-gain bg-gain/10",
              )}
            >
              {f.tone === "caution" ? <AlertTriangle className="text-learn size-4 shrink-0" aria-hidden="true" /> : f.tone === "good" ? <ThumbsUp className="text-gain size-4 shrink-0" aria-hidden="true" /> : <Info className="text-primary size-4 shrink-0" aria-hidden="true" />}
              <div>
                <p className="font-medium">{f.title}</p>
                <p>{f.body}</p>
                <Link href={`/glossary#${f.term}`} className="text-primary text-xs underline">
                  Learn the term
                </Link>
              </div>
            </div>
          ))}
          <Link href="/portfolio" className="text-primary text-sm underline underline-offset-4">
            See your practice portfolio
          </Link>
        </div>
      )}
    </div>
  );
}
