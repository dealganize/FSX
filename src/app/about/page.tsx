import type { Metadata } from "next";

export const metadata: Metadata = { title: "About, sources and credits" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">About FSX</h1>
        <p className="text-lg">
          FSX (Fantasy Stock Exchange) teaches beginners how the stock market works, using NFL fantasy football players as
          practice stocks. It is a portfolio project by John Rogers.
        </p>
      </header>

      <section className="border-learn bg-accent/40 space-y-2 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Educational only</h2>
        <p>
          FSX is not a broker and not a betting site. There is no real money, no deposits and no real orders. Practice trades use
          pretend credits stored only in your browser. Nothing here is financial advice. For decisions about real money, talk to a
          licensed financial adviser.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Data sources and credits</h2>
        <ul className="list-disc space-y-3 pl-5">
          <li>
            <strong>Player values (the "price")</strong>:{" "}
            <a className="underline" href="https://fantasycalc.com">FantasyCalc</a>, used under its{" "}
            <a className="underline" href="https://fantasycalc.com/terms-of-usage">terms of use</a>. FSX calls only its public
            current-values endpoint, once a day, and stores a daily snapshot to build price history. FSX is not affiliated with or
            endorsed by FantasyCalc.
          </li>
          <li>
            <strong>Players, injuries, trending adds/drops, leagues, rosters and transactions</strong>:{" "}
            <a className="underline" href="https://docs.sleeper.com">Sleeper's public API</a>, which is free for non-commercial use.
            The full player list is fetched at most once a day. Sleeper user data is read on demand, cached briefly and never stored.
          </li>
          <li>
            <strong>Company values</strong> for the Player ⇄ Stock card:{" "}
            <a className="underline" href="https://www.sec.gov/search-filings/edgar-application-programming-interfaces">SEC EDGAR</a>{" "}
            (public float as reported in each company's annual report). Values can be over a year old; each card shows its date.
          </li>
          <li>
            <strong>Not used</strong>: KeepTradeCut. Its terms don't allow automated collection or reuse of its data on other
            websites.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How prices and history work</h2>
        <p>
          Every day FSX saves each player's value. The chart grows by one point per day. On the very first day, one extra point is
          worked out from FantasyCalc's 30-day trend (today's value minus the 30-day change) and drawn as a dashed line. Nothing
          else is estimated.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">The AI tutor</h2>
        <p>
          "Explain this" uses Claude (Anthropic) with tools that read FSX's own data, so numbers come from the app, not from the
          model's memory. It is tested with an evaluation set for number accuracy, tool use, explanation quality and refusing
          investment advice. It can still make mistakes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Privacy</h2>
        <p>
          No accounts and no tracking. Your progress, quiz results and practice portfolio live in your browser's local storage, and
          you can reset them at any time. Questions you send to the tutor are passed to Anthropic's API to generate an answer.
        </p>
      </section>
    </article>
  );
}
