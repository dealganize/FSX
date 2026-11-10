"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Term, WhyNote } from "@/components/learn/term";
import { formatValue } from "@/lib/domain/market";
import type { MarketRow } from "@/lib/repo/market";
import { Change, InjuryChip, PositionChip, Sparkline } from "./bits";
import { cn } from "@/lib/utils";

export type SortKey = "value" | "change" | "volume" | "name";
const POSITIONS = ["ALL", "QB", "RB", "WR", "TE"] as const;

export function MarketTable({
  rows,
  initialSort,
  initialDir,
  initialPos,
  hasDailyHistory,
}: {
  rows: MarketRow[];
  initialSort: SortKey;
  initialDir: "asc" | "desc";
  initialPos: string;
  hasDailyHistory: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);
  const [pos, setPos] = useState(initialPos);
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<"1d" | "30d">(hasDailyHistory ? "1d" : "30d");

  const changeOf = (r: MarketRow) => (period === "1d" ? (r.change1d?.pct ?? null) : r.change30Pct);

  const shown = useMemo(() => {
    const filtered = rows.filter(
      (r) => (pos === "ALL" || r.position === pos) && (!q || r.name.toLowerCase().includes(q.toLowerCase())),
    );
    const key = (r: MarketRow): number | string => {
      switch (sort) {
        case "value": return r.value;
        case "change": return changeOf(r) ?? (dir === "desc" ? -Infinity : Infinity);
        case "volume": return r.adds + r.drops;
        case "name": return r.name;
      }
    };
    return [...filtered].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      const c = typeof ka === "string" ? ka.localeCompare(kb as string) : (ka as number) - (kb as number);
      return dir === "asc" ? c : -c;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, pos, q, sort, dir, period]);

  function sortBy(k: SortKey) {
    const nextDir = k === sort ? (dir === "desc" ? "asc" : "desc") : k === "name" ? "asc" : "desc";
    setSort(k);
    setDir(nextDir);
    const sp = new URLSearchParams(params.toString());
    sp.set("sort", k);
    sp.set("dir", nextDir);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="market-search" className="sr-only">
          Search players
        </label>
        <Input id="market-search" placeholder="Search players…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
        <ToggleGroup value={[pos]} onValueChange={(v) => v[0] && setPos(v[0])} aria-label="Filter by position" variant="outline" size="sm">
          {POSITIONS.map((p) => (
            <ToggleGroupItem key={p} value={p}>
              {p === "ALL" ? "All" : p}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup value={[period]} onValueChange={(v) => v[0] && setPeriod(v[0] as "1d" | "30d")} aria-label="Change period" variant="outline" size="sm">
          <ToggleGroupItem value="1d" disabled={!hasDailyHistory}>
            1 day
          </ToggleGroupItem>
          <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {!hasDailyHistory && (
        <p className="text-muted-foreground text-sm">
          Daily change appears once FSX has two daily snapshots. Until then the change column uses FantasyCalc's own 30-day trend.
        </p>
      )}
      <WhyNote>
        Sort by <strong>change</strong> to see the biggest movers, then compare with <strong>volume</strong>: a big move with lots of
        adds or drops means many managers are reacting, not just a few.
      </WhyNote>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <caption className="sr-only">NFL players as stocks: price, change, trend and volume</caption>
          <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
            <tr>
              <th scope="col" className="w-10 px-2 py-2 font-medium">
                #
              </th>
              <SortHeader sort={sort} dir={dir} onSort={sortBy} k="name">Player</SortHeader>
              <SortHeader sort={sort} dir={dir} onSort={sortBy} k="value" className="text-right">
                <Term id="price">Price</Term>
              </SortHeader>
              <SortHeader sort={sort} dir={dir} onSort={sortBy} k="change" className="text-right">
                <Term id="percent-change">{period === "1d" ? "1-day change" : "30-day change"}</Term>
              </SortHeader>
              <th scope="col" className="hidden px-2 py-2 font-medium md:table-cell">
                <Term id="trend">Trend</Term>
              </th>
              <SortHeader sort={sort} dir={dir} onSort={sortBy} k="volume" className="hidden text-right sm:table-cell">
                <Term id="volume">Volume</Term>
              </SortHeader>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40 border-t">
                <td className="text-muted-foreground px-2 py-2 tabular-nums">{r.rank}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <PositionChip position={r.position} />
                    <Link href={`/player/${r.id}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                    <span className="text-muted-foreground hidden text-xs sm:inline">{r.team ?? "FA"}</span>
                    <InjuryChip status={r.injuryStatus} />
                  </div>
                </td>
                <td className="px-2 py-2 text-right font-medium tabular-nums">{formatValue(r.value)}</td>
                <td className="px-2 py-2 text-right">
                  <Change pct={changeOf(r)} />
                </td>
                <td className="hidden px-2 py-2 md:table-cell">
                  <Sparkline values={r.spark} label={`${r.name} price trend`} />
                </td>
                <td className="hidden px-2 py-2 text-right tabular-nums sm:table-cell">
                  {r.adds || r.drops ? (
                    <span>
                      <span className="text-gain">+{r.adds.toLocaleString("en-US")}</span>{" "}
                      <span className="text-loss">−{r.drops.toLocaleString("en-US")}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="text-muted-foreground p-6 text-center">No players match.</p>}
      </div>
    </div>
  );
}

function SortHeader({
  k,
  sort,
  dir,
  onSort,
  children,
  className,
}: {
  k: SortKey;
  sort: SortKey;
  dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th scope="col" className={cn("px-2 py-2 font-medium", className)} aria-sort={sort === k ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <span className="inline-flex items-center gap-1">
        {children}
        <button type="button" onClick={() => onSort(k)} className="hover:bg-muted rounded p-0.5" aria-label={`Sort by ${k}`}>
          {sort === k && dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className={cn("size-3.5", sort !== k && "opacity-40")} />}
        </button>
      </span>
    </th>
  );
}
