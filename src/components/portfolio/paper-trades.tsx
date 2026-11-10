"use client";

import Link from "next/link";
import { usePaper } from "@/lib/client/store";
import { formatSigned, formatValue } from "@/lib/domain/market";

export function PaperTrades() {
  const { state } = usePaper();
  if (state.trades.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No practice trades yet. Buy a player from his page and it shows up here.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-lg border">
      {[...state.trades].reverse().map((t) => (
        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
          <span>
            <span className={t.side === "buy" ? "text-gain font-semibold" : "text-loss font-semibold"}>{t.side === "buy" ? "Bought" : "Sold"}</span>{" "}
            {t.quantity} × <Link href={`/player/${t.playerId}`} className="hover:underline">{t.name}</Link> at {formatValue(t.price)}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {t.realised !== undefined && <span className="mr-3">realised {formatSigned(t.realised)}</span>}
            {new Date(t.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </li>
      ))}
    </ul>
  );
}
