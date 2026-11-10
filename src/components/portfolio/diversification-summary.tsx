import type { Diversification } from "@/lib/domain/portfolio";

/** Plain-language reading of a diversification result. */
export function DiversificationSummary({ d }: { d: Diversification }) {
  if (!d.top) return null;
  const pct = Math.round(d.top.share * 100);
  const text =
    d.level === "concentrated"
      ? `${pct}% of the value is in ${d.top.position}s. That is concentrated: if ${d.top.position} values fall, most of this portfolio falls with them.`
      : d.level === "balanced"
        ? `The biggest slice is ${d.top.position}s at ${pct}%. Fairly balanced, with one position leading.`
        : `No position holds more than ${pct}% of the value. That is well diversified.`;
  return (
    <p className="text-sm" data-testid="diversification-summary">
      <span className="font-semibold">{d.level === "concentrated" ? "Concentrated. " : d.level === "balanced" ? "Balanced. " : "Diversified. "}</span>
      {text}
    </p>
  );
}
