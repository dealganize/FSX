"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Term, WhyNote } from "@/components/learn/term";
import { Change, PositionChip } from "@/components/market/bits";
import { PositionDonut } from "@/components/market/position-donut";
import { usePaper } from "@/lib/client/store";
import { diversification, unrealisedGain, type Holding } from "@/lib/domain/portfolio";
import { formatSigned, formatValue } from "@/lib/domain/market";
import { realisedTotal, STARTING_CASH } from "@/lib/domain/paper";
import { DiversificationSummary } from "./diversification-summary";
import { PlayerAvatar } from "@/components/market/avatars";

export function PaperPortfolio({ prices }: { prices: Record<string, { value: number }> }) {
  const { state, reset } = usePaper();
  const holdings: Holding[] = Object.values(state.positions).map((p) => ({
    playerId: p.playerId,
    name: p.name,
    position: p.position,
    quantity: p.quantity,
    price: prices[p.playerId]?.value ?? null,
    costBasis: p.costBasis,
  }));
  const invested = holdings.reduce((s, h) => s + (h.price ?? 0) * h.quantity, 0);
  const cost = holdings.reduce((s, h) => s + (h.costBasis ?? 0), 0);
  const total = state.cash + invested;
  const div = diversification(holdings);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Total value" value={formatValue(total)} sub={<Change pct={((total - STARTING_CASH) / STARTING_CASH) * 100} abs={total - STARTING_CASH} />} term="portfolio" />
        <Summary label="Credits (cash)" value={formatValue(state.cash)} />
        <Summary label="Unrealised gain" value={formatSigned(invested - cost)} sub={<span className="text-muted-foreground text-xs">on paper, not sold yet</span>} term="unrealised-gain" />
        <Summary label="Realised gain" value={formatSigned(realisedTotal(state))} sub={<span className="text-muted-foreground text-xs">locked in by selling</span>} term="realised-gain" />
      </div>

      {holdings.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-6">
            <p>
              You have {formatValue(STARTING_CASH)} practice credits and no holdings yet. Open any player and use the{" "}
              <strong>Practice trade</strong> panel to buy your first shares.
            </p>
            <ButtonLink href="/markets">Find a player in Markets</ButtonLink>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-left text-xs">
                  <tr>
                    <th className="py-2 font-medium">Player</th>
                    <th className="py-2 text-right font-medium">Shares</th>
                    <th className="py-2 text-right font-medium">
                      <Term id="cost-basis">Cost basis</Term>
                    </th>
                    <th className="py-2 text-right font-medium">Value now</th>
                    <th className="py-2 text-right font-medium">Gain / loss</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => {
                    const g = unrealisedGain(h);
                    return (
                      <tr key={h.playerId} className="border-t">
                        <td className="py-2">
                          <span className="flex items-center gap-2">
                            <PlayerAvatar name={h.name} position={h.position} />
                            <PositionChip position={h.position} />
                            <Link href={`/player/${h.playerId}`} className="hover:underline">
                              {h.name}
                            </Link>
                          </span>
                        </td>
                        <td className="py-2 text-right tabular-nums">{h.quantity}</td>
                        <td className="py-2 text-right tabular-nums">{formatValue(h.costBasis ?? 0)}</td>
                        <td className="py-2 text-right tabular-nums">{h.price === null ? "n/a" : formatValue(h.price * h.quantity)}</td>
                        <td className="py-2 text-right">{g ? <Change pct={g.pct} abs={g.abs} /> : "n/a"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <Term id="diversification">Diversification</Term>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PositionDonut slices={div.slices} label="Practice portfolio value by position" />
              <DiversificationSummary d={div} />
            </CardContent>
          </Card>
        </div>
      )}
      <WhyNote>
        Your practice gains use today's values. Values change once a day, so come back tomorrow to see how your holdings moved.
      </WhyNote>
      <Button variant="ghost" size="sm" onClick={reset}>
        <RotateCcw /> Reset practice portfolio
      </Button>
    </div>
  );
}

function Summary({ label, value, sub, term }: { label: string; value: string; sub?: React.ReactNode; term?: string }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="text-muted-foreground text-sm">{term ? <Term id={term}>{label}</Term> : label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {sub}
      </CardContent>
    </Card>
  );
}
