import Link from "next/link";

/** Server-rendered so the source credits are in the initial HTML (FantasyCalc terms, ADR 0002). */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="text-muted-foreground mx-auto max-w-6xl space-y-3 px-4 py-8 text-sm">
        <p className="text-foreground font-medium">
          Educational demo. Not a broker. No real money. Not financial advice.
        </p>
        <p>
          Player values: <a className="underline underline-offset-2" href="https://fantasycalc.com">FantasyCalc</a>.
          Players, injuries, trending adds/drops, leagues and rosters:{" "}
          <a className="underline underline-offset-2" href="https://sleeper.com">Sleeper</a>.
          Company values: <a className="underline underline-offset-2" href="https://www.sec.gov/search-filings/edgar-application-programming-interfaces">SEC EDGAR</a>.
          FSX is not affiliated with or endorsed by any of them.
        </p>
        <p className="flex flex-wrap gap-4">
          <Link className="underline underline-offset-2" href="/about">About, sources and credits</Link>
          <Link className="underline underline-offset-2" href="/glossary">Glossary</Link>
          <a className="underline underline-offset-2" href="https://github.com/dealganize/fantasy-stock-exchange">Source code</a>
        </p>
      </div>
    </footer>
  );
}
