"use client";
/** 3-question check at the end of a lesson. Instant feedback per answer; saved in the browser. */
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { PASS_MARK, type QuizQuestion } from "@/content/lessons";
import { useProgress } from "@/lib/client/store";
import { cn } from "@/lib/utils";

export function Quiz({ lessonId, questions, nextHref }: { lessonId: string; questions: QuizQuestion[]; nextHref: string | null }) {
  const { update } = useProgress();
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));
  const done = answers.every((a) => a !== null);
  const score = answers.filter((a, i) => a === questions[i]!.answer).length;

  function choose(qi: number, oi: number) {
    if (answers[qi] !== null) return;
    const next = answers.map((a, i) => (i === qi ? oi : a));
    setAnswers(next);
    if (next.every((a) => a !== null)) {
      const s = next.filter((a, i) => a === questions[i]!.answer).length;
      update((p) => ({ ...p, lessons: { ...p.lessons, [lessonId]: { score: s, total: questions.length, at: new Date().toISOString() } } }));
    }
  }

  return (
    <section aria-labelledby="quiz-title" className="space-y-5">
      <h2 id="quiz-title" className="text-xl font-semibold">
        Check your understanding
      </h2>
      {questions.map((q, qi) => {
        const picked = answers[qi];
        return (
          <fieldset key={q.q} className="space-y-2 rounded-lg border p-4">
            <legend className="px-1 font-medium">
              {qi + 1}. {q.q}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((o, oi) => {
                const isPicked = picked === oi;
                const isRight = oi === q.answer;
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => choose(qi, oi)}
                    disabled={picked !== null}
                    aria-pressed={isPicked}
                    className={cn(
                      "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      picked === null && "hover:border-primary hover:bg-secondary/50",
                      picked !== null && isRight && "border-gain bg-gain/10",
                      isPicked && !isRight && "border-loss bg-loss/10",
                    )}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <p role="status" className="flex gap-2 text-sm">
                {picked === q.answer ? (
                  <CheckCircle2 className="text-gain size-5 shrink-0" aria-hidden="true" />
                ) : (
                  <XCircle className="text-loss size-5 shrink-0" aria-hidden="true" />
                )}
                <span>
                  <strong>{picked === q.answer ? "Correct." : "Not quite."}</strong> {q.explain}
                </span>
              </p>
            )}
          </fieldset>
        );
      })}
      {done && (
        <div className={cn("rounded-lg border p-4", score >= PASS_MARK ? "border-gain bg-gain/10" : "border-learn bg-accent/40")} role="status">
          <p className="font-semibold">
            You scored {score} of {questions.length}. {score >= PASS_MARK ? "Lesson learned!" : "Have another read and try again."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {score < PASS_MARK && (
              <Button variant="outline" onClick={() => setAnswers(questions.map(() => null))}>
                Try again
              </Button>
            )}
            {nextHref && <ButtonLink href={nextHref}>Next lesson</ButtonLink>}
            <ButtonLink href="/" variant="outline">
              Back to the path
            </ButtonLink>
          </div>
        </div>
      )}
    </section>
  );
}
