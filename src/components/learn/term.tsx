"use client";
/**
 * <Term id="volume">Volume</Term>: when Learn mode is on, the word gets a dotted underline and
 * opens a popover with the plain, stock-market and fantasy-football meaning.
 * Uses a popover (click / tap / keyboard), not a hover-only tooltip, so it works on phones.
 */
import Link from "next/link";
import { getTerm } from "@/content/glossary";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProgress } from "@/lib/client/store";
import { cn } from "@/lib/utils";

export function Term({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { progress } = useProgress();
  const term = getTerm(id);
  if (!term || !progress.learnMode) return <span className={className}>{children}</span>;
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "cursor-help rounded-sm underline decoration-learn decoration-dotted decoration-2 underline-offset-4",
          className,
        )}
        aria-label={`${typeof children === "string" ? children : term.term}: what does this mean?`}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2 text-sm">
        <p className="font-semibold">{term.term}</p>
        <p>{term.plain}</p>
        <p>
          <span className="font-medium">In the stock market… </span>
          {term.stock}
        </p>
        <p>
          <span className="font-medium">In fantasy football… </span>
          {term.fantasy}
        </p>
        <Link href={`/glossary#${term.id}`} className="text-primary text-xs underline underline-offset-2">
          See it in the glossary
        </Link>
      </PopoverContent>
    </Popover>
  );
}

/** A "why this matters" note shown only in Learn mode. */
export function WhyNote({ children, className }: { children: React.ReactNode; className?: string }) {
  const { progress } = useProgress();
  if (!progress.learnMode) return null;
  return (
    <p className={cn("border-learn/60 bg-accent/50 text-accent-foreground rounded-md border-l-4 px-3 py-2 text-sm", className)}>
      <span className="font-semibold">Why this matters: </span>
      {children}
    </p>
  );
}
