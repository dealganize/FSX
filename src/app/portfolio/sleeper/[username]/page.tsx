import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Change, PositionChip } from "@/components/market/bits";
import { PositionDonut } from "@/components/market/position-donut";
import { DiversificationSummary } from "@/components/portfolio/diversification-summary";
import { UsernameForm } from "@/components/portfolio/username-form";
import { Term, WhyNote } from "@/components/learn/term";
import { ValuesCredit } from "@/components/sources";
import { AskButton } from "@/components/tutor/ask-button";
import { formatValue } from "@/lib/domain/market";
import { loadPortfolio } from "@/lib/repo/page-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Sleeper roster as a portfolio" };

export default function SleeperPortfolioPage(props: PageProps<"/portfolio/sleeper/[username]">) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">A real roster as a portfolio</h1>
        <p className="text-muted-foreground max-w-2xl">
          A real Sleeper fantasy roster, with every player valued at today's price, like the holdings in an investment account.
          Read-only: FSX never changes anything in Sleeper and doesn't store this data.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RosterContent {...props} />
      </Suspense>
    </div>
  );
}

async function RosterContent({ params, searchParams }: PageProps<"/portfolio/sleeper/[username]">) {
  const [{ username }, sp] = await Promise.all([params, searchParams]);
  const name = decodeURIComponent(username);
  const leagueId = typeof sp.league === "string" ? sp.league : undefined;
  const result = await loadPortfolio(name, leagueId);

  if (!result.ok) {
    return (
      <div className="space-y-4">
        <UsernameForm initial={name} target="portfolio" />
        <p role="alert" className="text-destructive">
          {result.message}
        </p>
      </div>
    );
  }
  const p = result.portfolio;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <UsernameForm initial={p.username} target="portfolio" />
        <AskButton question={`How diversified is ${p.username}'s roster in ${p.league.name}? Explain what that means.`} label="Explain this roster" />
      </div>
      <nav aria-label="Leagues" className="flex flex-wrap gap-2">
        {p.leagues.map((l) => (
          <Link
            key={l.id}
            href={`/portfolio/sleeper/${encodeURIComponent(p.username)}?league=${l.id}`}
            aria-current={l.id === p.league.id ? "page" : undefined}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              l.id === p.league.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
            )}
          >
            {l.name} <span>({l.isDynasty ? "dynasty" : "redraft"}, {l.teams} teams)</span>
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="space-y-1">
            <p className="text-muted-foreground text-sm">
              <Term id="portfolio">Portfolio value</Term>
            </p>
            <p className="text-2xl font-semibold tabular-nums" data-testid="roster-total">
              {formatValue(p.total)}
            </p>
            <p className="text-muted-foreground text-xs">Sum of {p.format} values of {p.holdings.length - p.unpriced} priced players</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="space-y-1">
            <p className="text-muted-foreground text-sm">
              <Term id="holding">Holdings</Term>
            </p>
            <p className="text-2xl font-semibold tabular-nums">{p.holdings.length}</p>
            <p className="text-muted-foreground text-xs">{p.unpriced} without a market value (kickers, defenses, deep bench)</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="space-y-1">
            <p className="text-muted-foreground text-sm">Biggest position</p>
            <p className="text-2xl font-semibold">
              {p.diversification.top ? `${p.diversification.top.position} ${Math.round(p.diversification.top.share * 100)}%` : "n/a"}
            </p>
            <p className="text-muted-foreground text-xs">Share of total value</p>
          </CardContent>
        </Card>
      </div>

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
                  <th className="py-2 text-right font-medium">Value</th>
                  <th className="hidden py-2 text-right font-medium sm:table-cell">30-day change</th>
                  <th className="py-2 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {p.holdings.map((h) => (
                  <tr key={h.playerId} className="border-t">
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <PositionChip position={h.position} />
                        {h.price !== null ? (
                          <Link href={`/player/${h.playerId}`} className="hover:underline">
                            {h.name}
                          </Link>
                        ) : (
                          <span>{h.name}</span>
                        )}
                        {h.starter && <span className="text-muted-foreground text-xs">starter</span>}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{h.price === null ? "n/a" : formatValue(h.price)}</td>
                    <td className="hidden py-2 text-right sm:table-cell">
                      <Change pct={h.change30Pct} />
                    </td>
                    <td className="py-2 text-right tabular-nums">{h.price && p.total ? `${Math.round((h.price / p.total) * 100)}%` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <Term id="diversification">Diversification</Term> by position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PositionDonut slices={p.diversification.slices} label={`${p.username}'s roster value by position`} />
            <DiversificationSummary d={p.diversification} />
            <WhyNote>
              Positions behave like <Term id="sector">sectors</Term>. If one position holds most of the value, a bad stretch for that
              position hits the whole roster.
            </WhyNote>
          </CardContent>
        </Card>
      </div>
      <p className="text-sm">
        <Link className="text-primary underline underline-offset-4" href={`/activity?user=${encodeURIComponent(p.username)}&league=${p.league.id}`}>
          See this roster's trades and waiver moves as order history
        </Link>
      </p>
      <ValuesCredit format={p.format} />
      <p className="text-muted-foreground text-xs">
        Rosters and leagues from <a className="underline" href="https://sleeper.com">Sleeper</a>.
      </p>
    </div>
  );
}
