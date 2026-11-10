import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Change, InjuryChip, PositionChip } from "@/components/market/bits";
import { FormatToggle } from "@/components/market/format-toggle";
import { PriceChart } from "@/components/market/price-chart";
import { TradePanel } from "@/components/market/trade-panel";
import { MatchCard } from "@/components/market/match-card";
import { Term, WhyNote } from "@/components/learn/term";
import { ValuesCredit, TrendingCredit } from "@/components/sources";
import { AskButton } from "@/components/tutor/ask-button";
import { formatValue, MIN_POINTS_FOR_VOLATILITY, volatilityBand } from "@/lib/domain/market";
import { loadCompanies, loadMarket, loadPlayer, parseFormat } from "@/lib/repo/page-data";
import { toMatchPlayers } from "@/lib/repo/slim";

export const metadata: Metadata = { title: "Player" };

export default function PlayerPage(props: PageProps<"/player/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[700px] w-full" />}>
      <PlayerContent {...props} />
    </Suspense>
  );
}

const BAND_COPY = {
  calm: "Calm: the value has moved only a little from day to day.",
  normal: "Normal: some day-to-day movement, like most players.",
  jumpy: "Jumpy: big day-to-day swings. Higher volatility means higher risk, both ways.",
};

async function PlayerContent({ params, searchParams }: PageProps<"/player/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const format = parseFormat(sp.fmt);
  const [detail, market, companies] = await Promise.all([loadPlayer(id), loadMarket(format), loadCompanies()]);
  if (!detail) notFound();
  const p = detail.player;
  const row = market.rows.find((r) => r.id === id);
  const series = detail.history[format];
  const vol = detail.volatilityPct[format];
  const realDays = series.filter((s) => !s.derived).length;
  const prices = Object.fromEntries(market.rows.map((r) => [r.id, { value: r.value, position: r.position }]));

  return (
    <div className="space-y-6" data-player-name={p.name}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <PositionChip position={p.position} />
            <span className="text-muted-foreground text-sm">{p.team ?? "Free agent"}</span>
            <InjuryChip status={p.injuryStatus} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{p.name}</h1>
          {row ? (
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-semibold tabular-nums">{formatValue(row.value)}</span>
              <Change pct={row.change1d?.pct ?? row.change30Pct} abs={row.change1d?.abs ?? row.change30Abs} size="lg" />
              <span className="text-muted-foreground text-sm">{row.change1d ? "since yesterday" : "over 30 days"}</span>
            </div>
          ) : (
            <p className="text-muted-foreground">Not priced in the {format} market today.</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <FormatToggle current={format} basePath={`/player/${id}`} />
          <AskButton question={`Explain what ${p.name}'s numbers on this page tell me, like I'm new to investing.`} label="Explain this player" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <Term id="price-chart">Price chart</Term>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <PriceChart series={series} name={p.name} />
              <ValuesCredit asOf={market.asOf} format={format} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key numbers</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <Stat label="Market rank" value={row ? `${row.rank} of ${market.rows.length}` : "n/a"} />
                <Stat label="Position rank" value={row?.positionRank ? `${p.position}${row.positionRank}` : "n/a"} />
                <Stat label="Age" value={p.age ? String(p.age) : "n/a"} />
                <Stat label="Years in the NFL" value={p.yearsExp !== null ? String(p.yearsExp) : "n/a"} />
                <Stat label="Injury status" value={p.injuryStatus ?? "None listed"} />
                <Stat label="Volume (24h)" value={!row ? "n/a" : row.adds || row.drops ? `+${row.adds.toLocaleString("en-US")} added / −${row.drops.toLocaleString("en-US")} dropped` : "Not trending today"} term="volume" />
              </dl>
              <div className="mt-4">
                <TrendingCredit />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Term id="volatility">Volatility</Term>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {vol === null ? (
                <p>
                  FSX needs at least {MIN_POINTS_FOR_VOLATILITY} daily snapshots to measure volatility honestly. It has {realDays} so far.
                  {row?.change30Pct !== null && row?.change30Pct !== undefined && (
                    <> Meanwhile, the value moved <Change pct={row.change30Pct} /> over 30 days.</>
                  )}
                </p>
              ) : (
                <p>
                  Typical daily move: <strong>{vol.toFixed(2)}%</strong>. {BAND_COPY[volatilityBand(vol)]}
                </p>
              )}
              {p.injuryStatus && (
                <p>
                  News risk: listed as <strong>{p.injuryStatus}</strong>
                  {p.injuryBodyPart ? ` (${p.injuryBodyPart})` : ""}. Injury news is one of the biggest causes of sudden moves.
                </p>
              )}
              <WhyNote>Volatile prices can rise fast but also fall fast. That is what investors mean by risk.</WhyNote>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Practice trade</CardTitle>
            </CardHeader>
            <CardContent>
              {row ? (
                <TradePanel
                  player={{ id, name: p.name, position: p.position, price: row.value, change30Pct: row.change30Pct, injuryStatus: p.injuryStatus }}
                  prices={prices}
                />
              ) : (
                <p className="text-muted-foreground text-sm">This player has no price in this market today.</p>
              )}
            </CardContent>
          </Card>
          {row && <MatchCard players={toMatchPlayers(market.rows)} companies={companies} initialId={id} allowPick={false} />}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, term }: { label: string; value: string; term?: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{term ? <Term id={term}>{label}</Term> : label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
