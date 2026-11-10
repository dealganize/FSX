/**
 * POST /api/tutor: streams the tutor's answer as NDJSON lines:
 *   {"type":"tool","name":"get_player"}  {"type":"text","delta":"..."}  {"type":"done"}  {"type":"error","message":"..."}
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { runTutor } from "@/lib/tutor/agent";
import { dbTutorData } from "@/lib/tutor/data";

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(1200) }))
    .min(1)
    .max(20)
    .refine((m) => m[m.length - 1]?.role === "user", "Last message must be from the user"),
  context: z.object({ path: z.string().max(200).optional(), playerName: z.string().max(80).optional() }).optional(),
});

// Best-effort per-instance rate limit: 12 questions per IP per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 12;
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ offline: true, message: "The tutor is offline on this deployment (no API key configured)." }, { status: 503 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return Response.json({ message: "You've asked a lot of questions in a short time. Try again in a few minutes." }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Invalid request." }, { status: 400 });

  const db = await getDb();
  const client = new Anthropic();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        await runTutor({
          client,
          data: dbTutorData(db),
          history: parsed.data.messages,
          context: parsed.data.context,
          events: { onText: (delta) => send({ type: "text", delta }), onToolStart: (name) => send({ type: "tool", name }) },
        });
        send({ type: "done" });
      } catch (err) {
        const message =
          err instanceof Anthropic.RateLimitError
            ? "The tutor is busy right now. Please try again in a minute."
            : err instanceof Anthropic.APIError
              ? "The tutor could not answer right now."
              : "Something went wrong.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
