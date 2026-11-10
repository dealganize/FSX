"use client";
/** First-run intro: one concept per card, then the Player ⇄ Stock match. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TwoWorlds } from "./two-worlds";
import { MatchCard, type MatchCompany, type MatchPlayer } from "@/components/market/match-card";
import { useProgress } from "@/lib/client/store";

export interface OnboardingCard {
  id: string;
  title: string;
  plain: string;
  stock: string;
  fantasy: string;
  example: string | null;
}

export function Onboarding({ cards, players, companies }: { cards: OnboardingCard[]; players: MatchPlayer[]; companies: MatchCompany[] }) {
  const [step, setStep] = useState(0);
  const { update } = useProgress();
  const router = useRouter();
  const total = cards.length + 1;
  const card = cards[step];

  function finish(href: string) {
    update((p) => ({ ...p, onboarded: true }));
    router.push(href);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          Step {step + 1} of {total}
        </p>
        <Progress value={((step + 1) / total) * 100} aria-label="Intro progress" />
      </div>

      {card ? (
        <section className="space-y-4" aria-labelledby="card-title">
          <h1 id="card-title" className="text-3xl font-bold tracking-tight">
            {card.title}
          </h1>
          <p className="text-lg">{card.plain}</p>
          <TwoWorlds stock={card.stock} fantasy={card.fantasy} />
          {card.example && (
            <p className="border-primary/40 bg-secondary/40 rounded-lg border p-4">
              <span className="text-primary block text-sm font-semibold">Live example from today's data</span>
              {card.example}
            </p>
          )}
        </section>
      ) : (
        <section className="space-y-4" aria-labelledby="match-title">
          <h1 id="match-title" className="text-3xl font-bold tracking-tight">
            One more thing: players and companies
          </h1>
          <p className="text-lg">
            Ranking is how markets compare things of very different size. Here every player is paired with a real company
            at the same rank in its own market.
          </p>
          <MatchCard players={players} companies={companies} initialId={players[0]?.id} />
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => finish("/")}>
            Skip intro
          </Button>
          {card ? (
            <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => finish("/markets")}>
                Explore freely
              </Button>
              <Button onClick={() => finish("/learn/price")}>Start the learning path</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
