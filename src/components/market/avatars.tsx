/**
 * Original avatars instead of photos and logos: player headshots, NFL marks and company logos are
 * owned by others, so FSX shows initials (tinted by position) and ticker badges. Decorative only:
 * the name is always written next to them, so they are hidden from screen readers.
 */
import { cn } from "@/lib/utils";

const POS_TINT: Record<string, string> = {
  QB: "bg-pos-qb/15 ring-pos-qb/60",
  RB: "bg-pos-rb/15 ring-pos-rb/60",
  WR: "bg-pos-wr/15 ring-pos-wr/60",
  TE: "bg-pos-te/15 ring-pos-te/60",
};

const SIZE = {
  sm: "size-7 text-[11px]",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
} as const;

/** "Jahmyr Gibbs" → "JG", "Marvin Harrison Jr." → "MH", "DET Defense" → "DE". */
export function initials(name: string): string {
  const parts = name
    .replace(/\b(jr|sr|ii|iii|iv|v)\.?$/i, "")
    .split(/[\s-]+/)
    .filter((p) => /[a-z]/i.test(p));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function PlayerAvatar({
  name,
  position,
  size = "sm",
  className,
}: {
  name: string;
  position: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-foreground inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight ring-2 ring-inset",
        SIZE[size],
        POS_TINT[position ?? ""] ?? "bg-muted ring-border",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function CompanyBadge({ ticker, size = "md", className }: { ticker: string; size?: keyof typeof SIZE; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-card text-foreground ring-border inline-flex shrink-0 select-none items-center justify-center rounded-lg font-mono font-semibold tracking-tight ring-2 ring-inset",
        SIZE[size],
        ticker.length > 3 && size !== "lg" ? "text-[10px]" : null,
        className,
      )}
    >
      {ticker}
    </span>
  );
}
