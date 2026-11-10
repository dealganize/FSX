"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UsernameForm({ initial, target }: { initial: string; target: "portfolio" | "activity" }) {
  const router = useRouter();
  const [name, setName] = useState(initial);
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const n = name.trim();
        if (!n) return;
        router.push(target === "portfolio" ? `/portfolio/sleeper/${encodeURIComponent(n)}` : `/activity?user=${encodeURIComponent(n)}`);
      }}
    >
      <label htmlFor="sleeper-user" className="sr-only">
        Sleeper username
      </label>
      <Input id="sleeper-user" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sleeper username" className="w-48" maxLength={30} />
      <Button type="submit" variant="outline">
        Load roster
      </Button>
    </form>
  );
}
