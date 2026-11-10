/** Inline source credits placed next to data (FantasyCalc requires attribution near its values). */
export function ValuesCredit({ asOf, format }: { asOf?: string | null; format?: "dynasty" | "redraft" }) {
  return (
    <p className="text-muted-foreground text-xs">
      Values: <a className="underline underline-offset-2" href="https://fantasycalc.com">FantasyCalc</a>
      {format ? ` (${format}, 1QB, 12 teams, PPR)` : ""}
      {asOf ? `, snapshot ${asOf}` : ""}.
    </p>
  );
}

export function TrendingCredit() {
  return (
    <p className="text-muted-foreground text-xs">
      Volume: trending adds and drops from <a className="underline underline-offset-2" href="https://sleeper.com">Sleeper</a>.
    </p>
  );
}
