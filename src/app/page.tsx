import Link from "next/link";
import { Suspense } from "react";
import { LearningPath, StartBanner } from "@/components/learn/learning-path";
import { MatchCard } from "@/components/market/match-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ValuesCredit, TrendingCredit } from "@/components/sources";
import { liveExample } from "@/lib/domain/live-examples";
import { loadCompanies, loadMarket } from "@/lib/repo/page-data";
import { toMatchPlayers } from "@/lib/repo/slim";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-primary text-sm font-semibold uppercase tracking-wide">Learn by doing, with practice credits</p>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          Learn how the stock market works, using football players you already know.
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Every NFL player is a pretend stock. His trade value is the price, Sleeper adds and drops are the volume, and
          a real fantasy roster is a portfolio. Each idea is explained twice: <em>in the stock market</em> and{" "}
          <em>in fantasy football</em>.
        </p>
        <StartBanner />
      </section>

      <LearningPath />

      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <TodayInTheMarket />
      </Suspense>
    </div>
  );
}

async function TodayInTheMarket() {
  const [market, companies] = await Promise.all([loadMarket("dynasty"), loadCompanies()]);
  const examples = (["top-value", "biggest-gainer-30d", "most-added"] as const)
    .map((k) => liveExample(k, market.rows))
    .filter((e) => e !== null);
  const players = toMatchPlayers(market.rows);
  const featured = players[Math.min(4, players.length - 1)]?.id;
  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <MatchCard players={players} companies={companies} initialId={featured} />
      <Card>
        <CardHeader>
          <CardTitle>Today in the market</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {examples.length === 0 && <p className="text-muted-foreground text-sm">No data yet. Run the daily snapshot.</p>}
          {examples.map((e) => (
            <p key={e.text} className="text-sm">
              {e.playerId ? (
                <Link href={`/player/${e.playerId}`} className="hover:underline">
                  {e.text}
                </Link>
              ) : (
                e.text
              )}
            </p>
          ))}
          <Link href="/markets" className="text-primary inline-block text-sm font-medium underline underline-offset-4">
            Explore all players in Markets
          </Link>
          <ValuesCredit asOf={market.asOf} format="dynasty" />
          <TrendingCredit />
        </CardContent>
      </Card>
    </div>
  );
}
