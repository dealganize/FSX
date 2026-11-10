"use client";
/** Value share by position. Fixed colour per position, legend with % (identity never colour-only). */
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatValue } from "@/lib/domain/market";
import type { PositionSlice } from "@/lib/domain/portfolio";
import { POSITION_FILL, POSITION_ORDER } from "./bits";

export function PositionDonut({ slices, label }: { slices: PositionSlice[]; label: string }) {
  // Fold anything that isn't QB/RB/WR/TE into "Other" and keep the fixed order.
  const main = POSITION_ORDER.map((p) => slices.find((s) => s.position === p)).filter((s): s is PositionSlice => Boolean(s));
  const rest = slices.filter((s) => !POSITION_ORDER.includes(s.position as (typeof POSITION_ORDER)[number]));
  const data = [
    ...main.map((s) => ({ name: s.position, value: s.value, share: s.share, count: s.count, fill: POSITION_FILL[s.position]! })),
    ...(rest.length
      ? [{ name: "Other", value: rest.reduce((a, s) => a + s.value, 0), share: rest.reduce((a, s) => a + s.share, 0), count: rest.reduce((a, s) => a + s.count, 0), fill: "var(--muted-foreground)" }]
      : []),
  ];
  if (data.length === 0) return <p className="text-muted-foreground text-sm">No priced holdings.</p>;
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
      <div className="h-44" role="img" aria-label={`${label}: ${data.map((d) => `${d.name} ${Math.round(d.share * 100)}%`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="95%" stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!active || !d) return null;
                return (
                  <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md">
                    <p className="font-medium">{d.name}</p>
                    <p className="tabular-nums">
                      {Math.round(d.share * 100)}% · {formatValue(d.value)} · {d.count} player{d.count === 1 ? "" : "s"}
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5 text-sm" aria-label="Legend">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ background: d.fill }} aria-hidden="true" />
            <span className="w-12 font-medium">{d.name}</span>
            <span className="tabular-nums">{Math.round(d.share * 100)}%</span>
            <span className="text-muted-foreground tabular-nums">
              ({formatValue(d.value)}, {d.count} player{d.count === 1 ? "" : "s"})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
