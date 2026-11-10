"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Lock, RotateCcw } from "lucide-react";
import { LESSONS, PASS_MARK } from "@/content/lessons";
import { useProgress } from "@/lib/client/store";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";

const COMING_SOON = ["Charts and trends", "Orders: market vs limit", "Portfolio value and gain/loss", "Buying high, selling low"];

export function LearningPath() {
  const { progress, reset } = useProgress();
  const learned = LESSONS.filter((l) => (progress.lessons[l.id]?.score ?? 0) >= PASS_MARK).length;
  const next = LESSONS.find((l) => (progress.lessons[l.id]?.score ?? 0) < PASS_MARK);
  return (
    <section aria-labelledby="path-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="path-title" className="text-xl font-semibold">
            Your learning path
          </h2>
          <p className="text-muted-foreground text-sm">
            {learned} of {LESSONS.length} lessons learned. Each takes 3 to 4 minutes and ends with a quick check.
          </p>
        </div>
        {next && (
          <ButtonLink href={`/learn/${next.id}`}>{learned === 0 ? "Start lesson 1" : `Continue: ${next.title}`}</ButtonLink>
        )}
      </div>
      <Progress value={(learned / LESSONS.length) * 100} aria-label="Lessons learned" />
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.map((l) => {
          const r = progress.lessons[l.id];
          const done = (r?.score ?? 0) >= PASS_MARK;
          return (
            <li key={l.id}>
              <Link
                href={`/learn/${l.id}`}
                className="bg-card hover:border-primary flex h-full gap-3 rounded-lg border p-4 transition-colors"
              >
                {done ? (
                  <CheckCircle2 className="text-gain mt-0.5 size-5 shrink-0" aria-label="Learned" />
                ) : (
                  <Circle className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-label="Not yet learned" />
                )}
                <span>
                  <span className="text-muted-foreground block text-xs">Lesson {l.number} · {l.minutes} min</span>
                  <span className="block font-medium">{l.title}</span>
                  <span className="text-muted-foreground block text-sm">You'll be able to {l.outcome}</span>
                  {r && <span className="mt-1 block text-xs">Quiz: {r.score}/{r.total}</span>}
                </span>
              </Link>
            </li>
          );
        })}
        {COMING_SOON.map((t, i) => (
          <li key={t} className="text-muted-foreground flex gap-3 rounded-lg border border-dashed p-4">
            <Lock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <span>
              <span className="block text-xs">Lesson {LESSONS.length + i + 1} · coming soon</span>
              <span className="block font-medium">{t}</span>
            </span>
          </li>
        ))}
      </ol>
      {Object.keys(progress.lessons).length > 0 && (
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw /> Reset my progress
        </Button>
      )}
    </section>
  );
}

export function StartBanner() {
  const { progress } = useProgress();
  if (progress.onboarded) return null;
  return (
    <div className="border-learn/50 bg-accent/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <p className="text-sm">
        <strong>New here?</strong> A 2-minute intro shows you five ideas, one at a time, using today's real data.
      </p>
      <ButtonLink href="/start">Start the intro</ButtonLink>
    </div>
  );
}
