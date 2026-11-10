import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { MarketTable, type SortKey } from "@/components/market/market-table";
import { FormatToggle } from "@/components/market/format-toggle";
import { Change } from "@/components/market/bits";
import { ValuesCredit, TrendingCredit } from "@/components/sources";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { loadMarket, parseFormat } from "@/lib/repo/page-data";
import type { MarketRow } from "@/lib/repo/market";

export const metadata: Metadata = { title: "Markets" };

export default function MarketsPage({ searchParams }: PageProps<"/markets">) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
        <p className="text-muted-foreground max-w-2xl">
          Every NFL player as a stock. The <strong>price</strong> is his trade value, the <strong>change</strong> shows how it
          moved, and <strong>volume</strong> is how many Sleeper managers added or dropped him in the last 24 hours.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <MarketsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const SORTS: SortKey[] = ["value", "change", "volume", "name"];

async function MarketsContent({ searchParams }: { searchParams: PageProps<"/markets">["searchParams"] }) {
  const sp = await searchParams;
  const format = parseFormat(sp.fmt);
  const market = await loadMarket(format);
  const sort = SORTS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "value";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const pos = typeof sp.pos === "string" && ["QB", "RB", "WR", "TE"].includes(sp.pos) ? sp.pos : "ALL";

  if (market.rows.length === 0) {
    return <p className="text-muted-foreground">No market data yet. Run <code>npm run snapshot</code> to load today's values.</p>;
  }
  const movers = market.rows.filter((r) => r.change30Pct !== null && r.value >= 1500);
  const gainers = [...movers].sort((a, b) => b.change30Pct! - a.change30Pct!).slice(0, 3);
  const losers = [...movers].sort((a, b) => a.change30Pct! - b.change30Pct!).slice(0, 3);
  const added = [...market.rows].sort((a, b) => b.adds - a.adds).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormatToggle current={format} basePath="/markets" />
        <div className="text-right">
          <ValuesCredit asOf={market.asOf} format={format} />
          <TrendingCredit />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <MoverCard title="Top gainers (30 days)" rows={gainers} kind="change" />
        <MoverCard title="Top fallers (30 days)" rows={losers} kind="change" />
        <MoverCard title="Most added today" rows={added} kind="adds" />
      </div>
      <MarketTable rows={market.rows} initialSort={sort} initialDir={dir} initialPos={pos} hasDailyHistory={market.historyDays >= 2} />
    </div>
  );
}

function MoverCard({ title, rows, kind }: { title: string; rows: MarketRow[]; kind: "change" | "adds" }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
              <Link href={`/player/${r.id}`} className="truncate hover:underline">
                {r.name}
              </Link>
              {kind === "change" ? <Change pct={r.change30Pct} /> : <span className="text-gain tabular-nums">+{r.adds.toLocaleString("en-US")}</span>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
