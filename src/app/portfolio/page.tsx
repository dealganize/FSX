import { Suspense } from "react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { PaperPortfolio } from "@/components/portfolio/paper-portfolio";
import { ValuesCredit } from "@/components/sources";
import { loadMarket } from "@/lib/repo/page-data";

export const metadata: Metadata = { title: "Portfolio" };

const DEMO_USER = process.env.NEXT_PUBLIC_DEMO_SLEEPER_USER || "johnrog";

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Your practice portfolio</h1>
          <p className="text-muted-foreground max-w-2xl">
            Everything you bought with practice credits, valued at today's prices. Compare it with a real fantasy roster to see
            how diversified each one is.
          </p>
        </div>
        <ButtonLink href={`/portfolio/sleeper/${DEMO_USER}`} variant="outline">
          See a real Sleeper roster as a portfolio
        </ButtonLink>
      </header>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PaperContent />
      </Suspense>
    </div>
  );
}

async function PaperContent() {
  const market = await loadMarket("dynasty");
  const prices = Object.fromEntries(market.rows.map((r) => [r.id, { value: r.value }]));
  return (
    <>
      <PaperPortfolio prices={prices} />
      <ValuesCredit asOf={market.asOf} format="dynasty" />
    </>
  );
}
