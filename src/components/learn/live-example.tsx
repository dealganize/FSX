import Link from "next/link";
import { Radio } from "lucide-react";
import { liveExample, type LiveExampleKey } from "@/lib/domain/live-examples";
import { loadMarket } from "@/lib/repo/page-data";
import { ValuesCredit } from "@/components/sources";

/** Server component: a sentence computed from today's market data. Wrap in <Suspense>. */
export async function LiveExample({ exampleKey }: { exampleKey: LiveExampleKey }) {
  const market = await loadMarket("dynasty");
  const ex = liveExample(exampleKey, market.rows);
  return (
    <div className="border-primary/40 bg-secondary/40 rounded-lg border p-4" data-testid="live-example">
      <p className="text-primary mb-1 flex items-center gap-2 text-sm font-semibold">
        <Radio className="size-4" aria-hidden="true" /> Live example from today's data
      </p>
      {ex ? (
        <p>
          {ex.playerId ? (
            <Link className="underline underline-offset-4" href={`/player/${ex.playerId}`}>
              {ex.text}
            </Link>
          ) : (
            ex.text
          )}
        </p>
      ) : (
        <p className="text-muted-foreground">No market data yet. Run the daily snapshot.</p>
      )}
      <div className="mt-2">
        <ValuesCredit asOf={market.asOf} />
      </div>
    </div>
  );
}
