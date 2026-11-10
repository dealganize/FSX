import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ValueFormat } from "@/lib/sources/fantasycalc";

/** Dynasty (default, long-term like a share price) vs redraft (this season only). */
export function FormatToggle({ current, basePath }: { current: ValueFormat; basePath: string }) {
  const item = (f: ValueFormat, label: string, hint: string) => (
    <Link
      href={f === "dynasty" ? basePath : `${basePath}?fmt=redraft`}
      aria-current={current === f ? "page" : undefined}
      title={hint}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium",
        current === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Value format" className="bg-muted inline-flex gap-1 rounded-lg p-1">
      {item("dynasty", "Dynasty", "Long-term value: like a share price that reflects years ahead")}
      {item("redraft", "Redraft", "This season only: like a short-term trade")}
    </nav>
  );
}
