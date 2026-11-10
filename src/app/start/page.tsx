import { Suspense } from "react";
import type { Metadata } from "next";
import { LESSONS } from "@/content/lessons";
import { Onboarding } from "@/components/learn/onboarding";
import { Skeleton } from "@/components/ui/skeleton";
import { liveExample } from "@/lib/domain/live-examples";
import { loadCompanies, loadMarket } from "@/lib/repo/page-data";
import { toMatchPlayers } from "@/lib/repo/slim";

export const metadata: Metadata = { title: "Start here" };

const TITLES: Record<string, string> = {
  price: "1. A price is what someone will pay today",
  change: "2. Prices go up and down",
  volume: "3. Volume: how many people are acting",
  volatility: "4. Volatility: how jumpy a price is",
  diversification: "5. Don't put all your eggs in one basket",
};

export default function StartPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
      <StartContent />
    </Suspense>
  );
}

async function StartContent() {
  const [market, companies] = await Promise.all([loadMarket("dynasty"), loadCompanies()]);
  const cards = LESSONS.map((l) => ({
    id: l.id,
    title: TITLES[l.id] ?? l.title,
    plain: l.plain,
    stock: l.stock,
    fantasy: l.fantasy,
    example: liveExample(l.example, market.rows)?.text ?? null,
  }));
  return <Onboarding cards={cards} players={toMatchPlayers(market.rows)} companies={companies} />;
}
