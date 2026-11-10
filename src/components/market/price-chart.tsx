"use client";
/** Price history line chart. One series (no legend box), crosshair tooltip, range tabs, table view. */
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatValue, type PricePoint } from "@/lib/domain/market";

const RANGES = [
  { key: "7", label: "7D", days: 7 },
  { key: "30", label: "30D", days: 30 },
  { key: "90", label: "90D", days: 90 },
  { key: "all", label: "All", days: Infinity },
] as const;

function cutoff(last: string, days: number): string {
  if (!Number.isFinite(days)) return "0000-00-00";
  const d = new Date(`${last}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function PriceChart({ series, name }: { series: PricePoint[]; name: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("all");
  const data = useMemo(() => {
    const last = series[series.length - 1];
    if (!last) return [];
    const r = RANGES.find((x) => x.key === range)!;
    const from = cutoff(last.date, r.days);
    // Keep the derived point visible as context, but on its own dashed segment.
    const pts = series.filter((p) => p.date >= from || (p.derived && range === "all"));
    const firstReal = pts.findIndex((p) => !p.derived);
    return pts.map((p, i) => ({
      date: p.date,
      value: p.value,
      derived: Boolean(p.derived),
      real: p.derived ? null : p.value,
      bridge: p.derived || i === firstReal ? p.value : null,
    }));
  }, [series, range]);

  const realDays = series.filter((p) => !p.derived).length;
  const hasDerived = data.some((d) => d.derived);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {realDays} daily snapshot{realDays === 1 ? "" : "s"} so far. History builds by one point a day.
        </p>
        <ToggleGroup value={[range]} onValueChange={(v) => v[0] && setRange(v[0] as typeof range)} variant="outline" size="sm" aria-label="Chart range">
          {RANGES.map((r) => (
            <ToggleGroupItem key={r.key} value={r.key}>
              {r.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="h-64 w-full" role="img" aria-label={`${name} value over time, ${data.length} points`}>
        {data.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis
                width={56}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => formatValue(v)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
                  if (!active || !p) return null;
                  return (
                    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md">
                      <p className="font-medium">{fmtDate(p.date)}</p>
                      <p className="tabular-nums">Value {formatValue(p.value)}</p>
                      {p.derived && <p className="text-muted-foreground text-xs">Derived from FantasyCalc's 30-day trend</p>}
                    </div>
                  );
                }}
              />
              <Line type="monotone" dataKey="bridge" stroke="var(--primary)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: "var(--card)", strokeWidth: 2 }} connectNulls isAnimationActive={false} />
              <Line type="monotone" dataKey="real" stroke="var(--primary)" strokeWidth={2} dot={data.length < 20 ? { r: 4, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 } : false} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground grid h-full place-items-center text-sm">Not enough history in this range yet.</p>
        )}
      </div>
      {hasDerived && (
        <p className="text-muted-foreground text-xs">
          Dashed line: the first point is worked out from FantasyCalc's 30-day trend (value minus 30-day change), not a stored snapshot.
        </p>
      )}
      <details className="text-sm">
        <summary className="text-primary cursor-pointer">Show as a table</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.date} className="border-t">
                <td className="py-1">
                  {d.date}
                  {d.derived ? " (derived)" : ""}
                </td>
                <td className="py-1 text-right tabular-nums">{formatValue(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
