import { Building2, Trophy } from "lucide-react";

/** The core teaching pattern: the same idea, side by side, in both worlds. */
export function TwoWorlds({ stock, fantasy }: { stock: string; fantasy: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="bg-card rounded-lg border p-4">
        <p className="text-primary mb-1 flex items-center gap-2 text-sm font-semibold">
          <Building2 className="size-4" aria-hidden="true" /> In the stock market…
        </p>
        <p>{stock}</p>
      </div>
      <div className="bg-card rounded-lg border p-4">
        <p className="text-learn mb-1 flex items-center gap-2 text-sm font-semibold">
          <Trophy className="size-4" aria-hidden="true" /> In fantasy football…
        </p>
        <p>{fantasy}</p>
      </div>
    </div>
  );
}
