/**
 * The tutor's tool loop (manual loop over the Messages API, streaming text as it arrives).
 * Shared by /api/tutor and the evals, so what we evaluate is exactly what users get.
 */
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS, runTool, type TutorData } from "./tools";
import { TUTOR_SYSTEM_PROMPT, contextNote } from "./prompt";

export const DEFAULT_TUTOR_MODEL = "claude-haiku-5-5";
export const MAX_ITERATIONS = 6;

export function tutorModel(): string {
  return process.env.FSX_TUTOR_MODEL || DEFAULT_TUTOR_MODEL;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ToolCallRecord {
  name: string;
  input: unknown;
  result: string;
  isError: boolean;
}

export interface TutorResult {
  text: string;
  toolCalls: ToolCallRecord[];
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
  stopReason: string | null;
  iterations: number;
  model: string;
}

export interface TutorEvents {
  onText?: (delta: string) => void;
  onToolStart?: (name: string) => void;
}

const tools: Anthropic.Tool[] = TOOL_DEFINITIONS.map((t) => ({ ...t, eager_input_streaming: true }));

export async function runTutor(args: {
  client: Anthropic;
  data: TutorData;
  history: ChatTurn[];
  context?: { path?: string; playerName?: string };
  model?: string;
  events?: TutorEvents;
}): Promise<TutorResult> {
  const model = args.model ?? tutorModel();
  const note = args.context ? contextNote(args.context) : null;
  const messages: Anthropic.MessageParam[] = args.history.map((t, i) =>
    i === args.history.length - 1 && t.role === "user" && note
      ? { role: "user", content: [{ type: "text", text: `(Context: ${note})` }, { type: "text", text: t.content }] }
      : { role: t.role, content: t.content },
  );

  const toolCalls: ToolCallRecord[] = [];
  const usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
  let text = "";
  let stopReason: string | null = null;
  let iterations = 0;
  let jsonRetries = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const stream = args.client.messages.stream({
      model,
      max_tokens: 4000,
      system: TUTOR_SYSTEM_PROMPT,
      tools,
      messages,
      output_config: { effort: "low" },
    });
    let turnText = "";
    stream.on("text", (delta) => {
      turnText += delta;
      args.events?.onText?.(delta);
    });

    let message: Anthropic.Message;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // Only an unparseable streamed tool input is retried; API errors go to the caller.
      if (err instanceof Anthropic.APIError || jsonRetries++ >= 1) throw err;
      continue;
    }
    usage.inputTokens += message.usage.input_tokens;
    usage.outputTokens += message.usage.output_tokens;
    usage.cacheReadTokens += message.usage.cache_read_input_tokens ?? 0;
    stopReason = message.stop_reason;
    text += turnText;

    if (message.stop_reason === "refusal") {
      text += text ? "" : "Sorry, I can't help with that one. Try asking about a market idea, like volume or diversification.";
      break;
    }
    const toolUses = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (message.stop_reason !== "tool_use" || toolUses.length === 0) break;
    if (message.stop_reason === "tool_use" && turnText) {
      args.events?.onText?.("\n\n");
      text += "\n\n";
    }

    messages.push({ role: "assistant", content: message.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const t of toolUses) {
      args.events?.onToolStart?.(t.name);
      const r = await runTool(t.name, t.input, args.data);
      toolCalls.push({ name: t.name, input: t.input, result: r.content, isError: r.isError });
      results.push({ type: "tool_result", tool_use_id: t.id, content: r.content, is_error: r.isError });
    }
    messages.push({ role: "user", content: results });
  }

  return { text: text.trim(), toolCalls, usage, stopReason, iterations, model };
}

/** USD per million tokens (first-party API, prompts ≤ 100K tokens). See docs/decisions/0005. */
export const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICES[model];
  if (!p) return NaN;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}
