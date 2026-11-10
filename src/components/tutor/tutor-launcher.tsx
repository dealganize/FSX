"use client";
/** "Explain this" tutor drawer. Available on every page; knows the current page. */
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What does volume mean here?",
  "Who is the biggest gainer this month, and what does that teach me?",
  "How diversified is johnrog's roster?",
  "Explain volatility like I'm new to this.",
];

const TOOL_LABELS: Record<string, string> = {
  search_players: "Looking up players",
  get_player: "Reading player data",
  get_price_history: "Reading price history",
  get_market_movers: "Checking market movers",
  get_sleeper_portfolio: "Reading the Sleeper roster",
  get_stock_match: "Finding the matching company",
  get_glossary_term: "Checking the glossary",
  get_lesson: "Opening the lesson",
};

/** Lets any page open the tutor with a prepared question. */
export function askTutor(question: string) {
  window.dispatchEvent(new CustomEvent("fsx:ask", { detail: question }));
}

export function TutorLauncher() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(q: string) => void>(() => {});

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [messages, status]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setError(null);
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setStatus("Thinking");
    try {
      const playerName = document.querySelector<HTMLElement>("[data-player-name]")?.dataset.playerName;
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12), context: { path: window.location.pathname, playerName } }),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "The tutor could not answer right now.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as { type: string; delta?: string; name?: string; message?: string };
          if (ev.type === "text" && ev.delta) {
            setStatus(null);
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1]!;
              copy[copy.length - 1] = { ...last, content: last.content + ev.delta };
              return copy;
            });
          } else if (ev.type === "tool" && ev.name) {
            setStatus(TOOL_LABELS[ev.name] ?? "Looking things up");
          } else if (ev.type === "error") {
            throw new Error(ev.message);
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
      setMessages((m) => (m[m.length - 1]?.content ? m : m.slice(0, -1)));
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }
  sendRef.current = send;

  useEffect(() => {
    const onAsk = (e: Event) => {
      setOpen(true);
      sendRef.current((e as CustomEvent<string>).detail);
    };
    window.addEventListener("fsx:ask", onAsk);
    return () => window.removeEventListener("fsx:ask", onAsk);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" aria-label="Open the Explain-this tutor" />}>
        <Sparkles className="text-learn" />
        <span className="hidden sm:inline">Explain this</span>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <div className="border-b p-4">
          <SheetTitle>Explain this</SheetTitle>
          <SheetDescription>
            An AI tutor that answers with FSX's own data. It explains concepts and never gives financial advice.
          </SheetDescription>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">Try one of these:</p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="hover:bg-muted block w-full rounded-md border px-3 py-2 text-left text-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "bg-primary text-primary-foreground ml-8 rounded-lg px-3 py-2 text-sm"
                  : "bg-muted mr-4 whitespace-pre-wrap rounded-lg px-3 py-2 text-sm"
              }
            >
              {m.content || (busy && i === messages.length - 1 ? "…" : "")}
            </div>
          ))}
          {status && <p className="text-muted-foreground text-xs">{status}…</p>}
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div ref={endRef} />
        </div>
        <form
          className="flex gap-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <label htmlFor="tutor-input" className="sr-only">
            Ask the tutor
          </label>
          <input
            id="tutor-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={1000}
            placeholder="Ask about any number or word…"
            className="bg-background flex-1 rounded-md border px-3 py-2 text-sm"
            disabled={busy}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
            <Send />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
