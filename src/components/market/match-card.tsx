"use client";
/** Player ⇄ Stock match card (spec §4.8). Pairs by relative value; an analogy, not advice. */
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatValue } from "@/lib/domain/market";
import { formatUsdBillions, investingStyle, matchCompany, STYLE_COPY, topPercentText } from "@/lib/domain/match";
import { Term } from "@/components/learn/term";
import { PositionChip } from "./bits";

export interface MatchPlayer {
  id: string;
  name: string;
  position: string | null;
  value: number;
  rank: number;
  age: number | null;
  change30Pct: number | null;
  injuryStatus: string | null;
}

export interface MatchCompany {
  ticker: string;
  name: string;
  valueUsd: number;
  asOf: string;
}

export function MatchCard({
  players,
  companies,
  initialId,
  allowPick = true,
}: {
  players: MatchPlayer[];
  companies: MatchCompany[];
  initialId?: string;
  allowPick?: boolean;
}) {
  const [id, setId] = useState(initialId ?? players[0]?.id);
  const [query, setQuery] = useState("");
  const player = players.find((p) => p.id === id) ?? players[0];
  const match = useMemo(
    () => (player ? matchCompany(player.rank, players.length, companies) : null),
    [player, players.length, companies],
  );
  const results = query.length >= 2 ? players.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [];

  if (!player || !match) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>If this player were a stock…</CardTitle>
          <CardDescription>No market data yet. Run the daily snapshot to fill the market.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const style = investingStyle({ age: player.age, overallRank: player.rank, trend30Pct: player.change30Pct, injuryStatus: player.injuryStatus });
  const copy = STYLE_COPY[style];
  const where = topPercentText(match.percentile);

  return (
    <Card className="overflow-hidden" data-testid="match-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="text-learn size-5" aria-hidden="true" />
          If this player were a stock…
        </CardTitle>
        <CardDescription>
          Players are ranked by trade value, companies by <Term id="public-float">public float</Term>. Each player is
          paired with the company at the same spot in its own market.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="bg-secondary/60 rounded-lg p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Player</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
              <PositionChip position={player.position} />
              <Link href={`/player/${player.id}`} className="hover:underline">
                {player.name}
              </Link>
            </p>
            <p className="text-sm">
              Value {formatValue(player.value)} · rank {player.rank} of {players.length}
            </p>
          </div>
          <p className="text-muted-foreground text-center text-sm font-medium" aria-hidden="true">
            ≈
          </p>
          <div className="bg-accent/60 rounded-lg p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Company</p>
            <p className="mt-1 text-lg font-semibold">
              {match.company.name} <span className="text-muted-foreground text-sm font-normal">({match.company.ticker})</span>
            </p>
            <p className="text-sm">
              Public float {formatUsdBillions(match.company.valueUsd)} · rank {match.companyRank} of {companies.length}
            </p>
            <p className="text-muted-foreground text-xs">Reported to the SEC as of {match.company.asOf}</p>
          </div>
        </div>
        <p>
          Both sit in the <strong>{where}</strong> of their market. Like {match.company.name} among these companies,{" "}
          {player.name} is {match.percentile <= 0.1 ? "one of the most valuable" : match.percentile >= 0.9 ? "one of the least valuable" : "somewhere in the middle"} of the{" "}
          {players.length} players FSX lists today.
        </p>
        <div className="rounded-md border p-3 text-sm">
          <p className="font-semibold">
            Style: <Term id={style === "growth" ? "growth-stock" : style === "blue-chip" ? "blue-chip" : "risk"}>{copy.label}</Term>
          </p>
          <p>
            <span className="font-medium">In the stock market… </span>
            {copy.stock}
          </p>
          <p>
            <span className="font-medium">In fantasy football… </span>
            {copy.fantasy}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setId(players[Math.floor(Math.random() * players.length)]!.id)}
          >
            <Shuffle /> Shuffle
          </Button>
          {allowPick && (
            <div className="relative">
              <label htmlFor="match-search" className="sr-only">
                Pick a player
              </label>
              <Input
                id="match-search"
                placeholder="Pick a player…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 w-48"
                autoComplete="off"
              />
              {results.length > 0 && (
                <ul className="bg-popover absolute z-10 mt-1 w-64 rounded-md border shadow-md">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        className="hover:bg-muted w-full px-3 py-1.5 text-left text-sm"
                        onClick={() => {
                          setId(r.id);
                          setQuery("");
                        }}
                      >
                        {r.name} <span className="text-muted-foreground">({r.position})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          An analogy to teach ranking and market size, not a view on any company as an investment. Company values: SEC
          EDGAR. Player values: <a className="underline" href="https://fantasycalc.com">FantasyCalc</a>.
        </p>
      </CardContent>
    </Card>
  );
}
