import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Hand } from "lucide-react";
import { LESSONS, getLesson } from "@/content/lessons";
import { GLOSSARY } from "@/content/glossary";
import { TwoWorlds } from "@/components/learn/two-worlds";
import { LiveExample } from "@/components/learn/live-example";
import { Quiz } from "@/components/learn/quiz";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { AskButton } from "@/components/tutor/ask-button";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ lesson: l.id }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[lesson]">): Promise<Metadata> {
  const l = getLesson((await params).lesson);
  return { title: l ? `Lesson ${l.number}: ${l.title}` : "Lesson" };
}

export default async function LessonPage({ params }: PageProps<"/learn/[lesson]">) {
  const lesson = getLesson((await params).lesson);
  if (!lesson) notFound();
  const next = LESSONS[LESSONS.indexOf(lesson) + 1];
  const terms = GLOSSARY.filter((t) => lesson.terms.includes(t.id));

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="text-muted-foreground text-sm">
          Lesson {lesson.number} of {LESSONS.length} · {lesson.minutes} min
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>
        <p className="text-muted-foreground">After this lesson you can {lesson.outcome}</p>
      </header>

      <section className="space-y-4">
        <h2 className="sr-only">The idea</h2>
        <p className="text-lg">{lesson.plain}</p>
        <TwoWorlds stock={lesson.stock} fantasy={lesson.fantasy} />
        <Suspense fallback={<Skeleton className="h-24 w-full" />}>
          <LiveExample exampleKey={lesson.example} />
        </Suspense>
        <p className="border-learn/60 bg-accent/50 text-accent-foreground rounded-md border-l-4 px-3 py-2">
          <span className="font-semibold">Why it matters: </span>
          {lesson.whyItMatters}
        </p>
      </section>

      <section aria-labelledby="try-title" className="bg-card space-y-3 rounded-lg border p-5">
        <h2 id="try-title" className="flex items-center gap-2 text-xl font-semibold">
          <Hand className="text-learn size-5" aria-hidden="true" /> Try it
        </h2>
        <p>{lesson.handsOn.task}</p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={lesson.handsOn.href}>{lesson.handsOn.label}</ButtonLink>
          <AskButton question={`Explain "${lesson.title}" with an example from today's data.`} />
        </div>
      </section>

      <section aria-labelledby="terms-title" className="space-y-3">
        <h2 id="terms-title" className="text-xl font-semibold">
          Words in this lesson
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {terms.map((t) => (
            <div key={t.id} className="rounded-lg border p-3">
              <dt className="font-medium">{t.term}</dt>
              <dd className="text-muted-foreground text-sm">{t.plain}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Quiz lessonId={lesson.id} questions={lesson.quiz} nextHref={next ? `/learn/${next.id}` : null} />
    </article>
  );
}
