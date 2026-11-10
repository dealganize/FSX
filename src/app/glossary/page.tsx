import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { GLOSSARY, type GlossaryTerm } from "@/content/glossary";
import { TwoWorlds } from "@/components/learn/two-worlds";
import { liveExample } from "@/lib/domain/live-examples";
import { loadMarket } from "@/lib/repo/page-data";
import type { MarketRow } from "@/lib/repo/market";

export const metadata: Metadata = { title: "Glossary" };

export default function GlossaryPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Glossary</h1>
        <p className="text-muted-foreground">
          {GLOSSARY.length} words, each explained in plain language, then in the stock market and in fantasy football, with a
          live example from today's data where one exists.
        </p>
        <nav aria-label="Terms" className="flex flex-wrap gap-2 pt-2">
          {GLOSSARY.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="hover:bg-muted rounded border px-2 py-0.5 text-xs">
              {t.term}
            </a>
          ))}
        </nav>
      </header>
      <Suspense fallback={<TermList rows={null} />}>
        <WithData />
      </Suspense>
    </div>
  );
}

async function WithData() {
  const market = await loadMarket("dynasty");
  return <TermList rows={market.rows} />;
}

function TermList({ rows }: { rows: MarketRow[] | null }) {
  return (
    <dl className="space-y-8">
      {GLOSSARY.map((t) => (
        <TermEntry key={t.id} t={t} rows={rows} />
      ))}
    </dl>
  );
}

function TermEntry({ t, rows }: { t: GlossaryTerm; rows: MarketRow[] | null }) {
  const ex = t.example && rows ? liveExample(t.example, rows) : null;
  return (
    <div id={t.id} className="scroll-mt-24 space-y-3">
      <dt className="text-xl font-semibold">{t.term}</dt>
      <dd className="space-y-3">
        <p className="text-lg">{t.plain}</p>
        <TwoWorlds stock={t.stock} fantasy={t.fantasy} />
        {ex && (
          <p className="text-sm">
            <span className="text-primary font-semibold">Live example: </span>
            {ex.playerId ? (
              <Link href={`/player/${ex.playerId}`} className="underline underline-offset-4">
                {ex.text}
              </Link>
            ) : (
              ex.text
            )}
          </p>
        )}
      </dd>
    </div>
  );
}
