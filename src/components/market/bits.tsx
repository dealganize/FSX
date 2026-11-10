/** Small shared market UI: change badges, sparklines, position chips. Server- and client-safe. */
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatPct, formatSigned } from "@/lib/domain/market";
import { cn } from "@/lib/utils";

export function Change({
  pct,
  abs,
  className,
  size = "sm",
}: {
  pct: number | null | undefined;
  abs?: number | null;
  className?: string;
  size?: "sm" | "lg";
}) {
  if (pct === null || pct === undefined) {
    return <span className={cn("text-muted-foreground", className)}>n/a</span>;
  }
  const up = pct > 0.05;
  const down = pct < -0.05;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        up && "text-gain",
        down && "text-loss",
        !up && !down && "text-muted-foreground",
        size === "lg" && "text-lg",
        className,
      )}
    >
      <Icon className={size === "lg" ? "size-5" : "size-3.5"} aria-hidden="true" />
      <span className="sr-only">{up ? "up" : down ? "down" : "unchanged"} </span>
      {abs !== undefined && abs !== null ? `${formatSigned(abs)} (${formatPct(pct)})` : formatPct(pct)}
    </span>
  );
}

export function Sparkline({ values, className, label }: { values: number[]; className?: string; label?: string }) {
  if (values.length < 2) return <span className="text-muted-foreground text-xs">building</span>;
  const w = 80;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`);
  const up = values[values.length - 1]! >= values[0]!;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-6 w-20", className)} role="img" aria-label={label ?? (up ? "trending up" : "trending down")}>
      <polyline points={pts.join(" ")} fill="none" strokeWidth="1.75" className={up ? "stroke-gain" : "stroke-loss"} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const POS_BORDER: Record<string, string> = {
  QB: "border-l-pos-qb",
  RB: "border-l-pos-rb",
  WR: "border-l-pos-wr",
  TE: "border-l-pos-te",
};

export function PositionChip({ position }: { position: string | null }) {
  return (
    <span
      className={cn(
        "bg-muted text-foreground inline-flex min-w-9 justify-center rounded border-l-[3px] px-1.5 py-0.5 text-xs font-semibold",
        POS_BORDER[position ?? ""] ?? "border-l-border",
      )}
    >
      {position ?? "?"}
    </span>
  );
}

export const POSITION_FILL: Record<string, string> = {
  QB: "var(--pos-qb)",
  RB: "var(--pos-rb)",
  WR: "var(--pos-wr)",
  TE: "var(--pos-te)",
};
/** Fixed order so colours follow the position, never its rank. Anything else folds into "Other". */
export const POSITION_ORDER = ["QB", "RB", "WR", "TE"] as const;

export function InjuryChip({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <span className="bg-loss/10 text-loss ring-loss/30 rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset" title="Injury status from Sleeper">
      {status}
    </span>
  );
}
