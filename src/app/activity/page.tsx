import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaperTrades } from "@/components/portfolio/paper-trades";
import { UsernameForm } from "@/components/portfolio/username-form";
import { Term, WhyNote } from "@/components/learn/term";
import { ValuesCredit } from "@/components/sources";
import { formatSigned, formatValue } from "@/lib/domain/market";
import { loadActivityPage } from "@/lib/repo/page-data";
import type { OrderHistoryItem } from "@/lib/domain/activity";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity" };

const KIND: Record<OrderHistoryItem["kind"], string> = {
  trade: "Trade",
  waiver: "Waiver claim",
  free_agent: "Free-agent pickup",
  other: "Move",
};

export default function ActivityPage(props: PageProps<"/activity">) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground max-w-2xl">
          Order history, two ways: your practice trades, and real trades and waiver moves from a Sleeper league, shown the way a
          brokerage shows buys and sells.
        </p>
      </header>
      <section className="space-y-3" aria-labelledby="paper-title">
        <h2 id="paper-title" className="text-xl font-semibold">
          Your practice trades
        </h2>
        <PaperTrades />
      </section>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RealActivity {...props} />
      </Suspense>
    </div>
  );
}

async function RealActivity({ searchParams }: PageProps<"/activity">) {
  const sp = await searchParams;
  const user = typeof sp.user === "string" ? sp.user : process.env.NEXT_PUBLIC_DEMO_SLEEPER_USER || "johnrog";
  const leagueId = typeof sp.league === "string" ? sp.league : undefined;
  const { portfolio, activity, names } = await loadActivityPage(user, leagueId);

  return (
    <section className="space-y-4" aria-labelledby="real-title">
      <h2 id="real-title" className="text-xl font-semibold">
        Real moves from Sleeper
      </h2>
      <UsernameForm initial={user} target="activity" />
      {!portfolio.ok ? (
        <p role="alert" className="text-destructive">
          {portfolio.message}
        </p>
      ) : (
        <>
          <nav aria-label="Leagues" className="flex flex-wrap gap-2">
            {portfolio.portfolio.leagues.map((l) => (
              <Link
                key={l.id}
                href={`/activity?user=${encodeURIComponent(portfolio.portfolio.username)}&league=${l.id}`}
                aria-current={l.id === portfolio.portfolio.league.id ? "page" : undefined}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  l.id === portfolio.portfolio.league.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
                )}
              >
                {l.name}
              </Link>
            ))}
          </nav>
          <WhyNote>
            Each move is valued at <strong>today's</strong> prices, so you can see whether it gained or lost value since. Adding a
            player is like buying; dropping or trading him away is like selling. This is a{" "}
            <Term id="realised-gain">realised</Term> decision: it's done.
          </WhyNote>
          {activity && "error" in activity ? (
            <p role="alert" className="text-destructive">
              {activity.error}
            </p>
          ) : activity && activity.items.length === 0 ? (
            <p className="text-muted-foreground">No moves this season yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity?.items.map((item) => (
                <li key={item.id}>
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span>
                          {KIND[item.kind]}
                          {item.week ? ` · week ${item.week}` : ""} ·{" "}
                          {new Date(item.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                        </span>
                        {item.kind === "trade" && (
                          <span className={cn("tabular-nums", item.netValue >= 0 ? "text-gain" : "text-loss")}>
                            Net today: {formatSigned(item.netValue)}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                      <Legs label="Bought" legs={item.bought} names={names ?? {}} positive />
                      <Legs label="Sold" legs={item.sold} names={names ?? {}} />
                      {item.draftPicksInvolved && <p className="text-muted-foreground text-xs sm:col-span-2">Draft picks were also part of this trade (not valued here).</p>}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          <ValuesCredit format={portfolio.portfolio.format} />
        </>
      )}
    </section>
  );
}

function Legs({
  label,
  legs,
  names,
  positive,
}: {
  label: string;
  legs: { playerId: string; value: number | null }[];
  names: Record<string, { name: string; position: string | null }>;
  positive?: boolean;
}) {
  return (
    <div>
      <p className={cn("font-semibold", positive ? "text-gain" : "text-loss")}>{label}</p>
      {legs.length === 0 ? (
        <p className="text-muted-foreground">Nothing</p>
      ) : (
        <ul>
          {legs.map((l) => (
            <li key={l.playerId} className="flex justify-between gap-2">
              <span>
                {names[l.playerId]?.name ?? `Player ${l.playerId}`}{" "}
                <span className="text-muted-foreground">{names[l.playerId]?.position ?? ""}</span>
              </span>
              <span className="tabular-nums">{l.value === null ? "no value" : formatValue(l.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
