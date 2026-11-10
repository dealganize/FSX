/**
 * Tutor eval runner.
 *
 *   npm run eval:dry                 free: checks tool wiring on fixture data and re-grades the
 *                                    recorded transcripts in evals/results/latest.json with the code graders
 *   npm run eval -- --estimate       free: prints the expected cost of a full run
 *   npm run eval                     calls the Anthropic API (needs ANTHROPIC_API_KEY); costs money
 *
 * Options: --cases=id1,id2  --reps=1  --model=claude-haiku-5-5  --judge-model=claude-sonnet-5-5  --max-usd=1
 *
 * Data: an in-memory PGlite database seeded from fixtures/ and Sleeper fixtures, so every run sees the
 * same market (snapshot 2026-11-10). The runner calls the same runTutor() the app uses.
 */
import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createPgliteDb, migrateDb } from "../src/lib/db/client";
import { fixtureSources } from "../src/lib/jobs/market-sources";
import { runSnapshot } from "../src/lib/jobs/snapshot";
import { DEFAULT_TUTOR_MODEL, costUsd, runTutor, type ToolCallRecord } from "../src/lib/tutor/agent";
import { dbTutorData } from "../src/lib/tutor/data";
import { runTool, TOOL_DEFINITIONS } from "../src/lib/tutor/tools";
import { CASES, type Check, type EvalCase } from "./cases";
import {
  gradeNumbers,
  gradeRefusalHeuristic,
  gradeTools,
  JUDGE_SYSTEM,
  judgePasses,
  judgeSchema,
  judgeUserPrompt,
  REFUSAL_RUBRIC,
  type JudgeVerdict,
} from "./graders";

process.env.FSX_SLEEPER_FIXTURES = "1";
const RESULTS_DIR = path.join(process.cwd(), "evals", "results");
const LATEST = path.join(RESULTS_DIR, "latest.json");
const DEFAULT_JUDGE = "claude-sonnet-5-5";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k!, v ?? "true"] as const;
  }),
);

interface CaseResult {
  id: string;
  rep: number;
  question: string;
  checks: Check[];
  answer: string;
  toolCalls: { name: string; input: unknown; isError: boolean }[];
  toolResults: string[];
  stopReason: string | null;
  servedModels: string[];
  usage: { inputTokens: number; outputTokens: number };
  judgeUsage?: { inputTokens: number; outputTokens: number };
  grades: Partial<Record<Check, { pass: boolean; detail: unknown }>>;
  pass: boolean;
}

interface RunFile {
  runAt: string;
  tutorModel: string;
  judgeModel: string;
  reps: number;
  results: CaseResult[];
  errors: { id: string; rep: number; error: string }[];
  totals: Totals;
}

interface Totals {
  cases: number;
  passed: number;
  passRate: number;
  byCheck: Record<string, { passed: number; total: number }>;
  tutorTokens: { input: number; output: number };
  judgeTokens: { input: number; output: number };
  costUsd: { tutor: number; judge: number; total: number };
}

async function fixtureDb() {
  const db = await createPgliteDb("memory://");
  await migrateDb(db, "");
  await runSnapshot(db, fixtureSources, { date: "2026-11-10", forcePlayers: true });
  return db;
}

function totals(results: CaseResult[], tutorModel: string, judgeModel: string): Totals {
  const byCheck: Totals["byCheck"] = {};
  for (const r of results)
    for (const [k, g] of Object.entries(r.grades)) {
      byCheck[k] ??= { passed: 0, total: 0 };
      byCheck[k].total++;
      if (g.pass) byCheck[k].passed++;
    }
  const tIn = results.reduce((s, r) => s + r.usage.inputTokens, 0);
  const tOut = results.reduce((s, r) => s + r.usage.outputTokens, 0);
  const jIn = results.reduce((s, r) => s + (r.judgeUsage?.inputTokens ?? 0), 0);
  const jOut = results.reduce((s, r) => s + (r.judgeUsage?.outputTokens ?? 0), 0);
  const tutor = costUsd(tutorModel, tIn, tOut);
  const judge = costUsd(judgeModel, jIn, jOut);
  const passed = results.filter((r) => r.pass).length;
  return {
    cases: results.length,
    passed,
    passRate: results.length ? passed / results.length : 0,
    byCheck,
    tutorTokens: { input: tIn, output: tOut },
    judgeTokens: { input: jIn, output: jOut },
    costUsd: { tutor, judge, total: tutor + judge },
  };
}

function codeGrades(c: EvalCase, answer: string, toolCalls: ToolCallRecord[] | CaseResult["toolCalls"], toolResults: string[]) {
  const grades: CaseResult["grades"] = {};
  if (c.checks.includes("numbers")) {
    const v = gradeNumbers(answer, toolResults, c.question);
    grades.numbers = { pass: v.pass, detail: v };
  }
  if (c.checks.includes("tools")) {
    const v = gradeTools(toolCalls.map((t) => t.name), c.expectTools);
    grades.tools = { pass: v.pass, detail: v };
  }
  return grades;
}

async function judge(client: Anthropic, model: string, c: EvalCase, answer: string, toolResults: string[], kind: "judge" | "refusal") {
  const res = await client.messages.parse({
    model,
    max_tokens: 4000,
    system: JUDGE_SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(judgeSchema) },
    messages: [{ role: "user", content: judgeUserPrompt({ question: c.question, rubric: kind === "refusal" ? REFUSAL_RUBRIC : c.rubric!, answer, toolResults }) }],
  });
  if (res.model !== model) throw new Error(`judge served by ${res.model}, expected ${model}`);
  const verdict = res.parsed_output as JudgeVerdict | null;
  if (!verdict) throw new Error(`judge output unparseable (stop_reason ${res.stop_reason})`);
  return { verdict, usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens } };
}

async function full() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Use `npm run eval:dry` for the free checks.");
    process.exit(2);
  }
  const tutorModel = args.get("model") ?? process.env.FSX_TUTOR_MODEL ?? DEFAULT_TUTOR_MODEL;
  const judgeModel = args.get("judge-model") ?? DEFAULT_JUDGE;
  const reps = Number(args.get("reps") ?? 1);
  const maxUsd = Number(args.get("max-usd") ?? 1);
  const only = args.get("cases")?.split(",");
  const cases = only ? CASES.filter((c) => only.includes(c.id)) : CASES;

  const db = await fixtureDb();
  const data = dbTutorData(db);
  const client = new Anthropic({ maxRetries: 4 });
  const results: CaseResult[] = [];
  const errors: RunFile["errors"] = [];

  for (const c of cases)
    for (let rep = 1; rep <= reps; rep++) {
      const spent = totals(results, tutorModel, judgeModel).costUsd.total;
      if (spent > maxUsd) {
        console.error(`Stopping: spent $${spent.toFixed(3)} > --max-usd ${maxUsd}`);
        break;
      }
      process.stdout.write(`${c.id} (rep ${rep}) … `);
      try {
        const t = await runTutor({ client, data, history: [{ role: "user", content: c.question }], context: c.context, model: tutorModel });
        if (t.servedModels.some((m) => m !== tutorModel)) throw new Error(`tutor served by ${t.servedModels.join(",")}, expected ${tutorModel}`);
        const toolResults = t.toolCalls.map((x) => x.result);
        const grades = codeGrades(c, t.text, t.toolCalls, toolResults);
        const judgeUsage = { inputTokens: 0, outputTokens: 0 };
        for (const kind of ["judge", "refusal"] as const) {
          if (!c.checks.includes(kind)) continue;
          const j = await judge(client, judgeModel, c, t.text, toolResults, kind);
          judgeUsage.inputTokens += j.usage.inputTokens;
          judgeUsage.outputTokens += j.usage.outputTokens;
          const heuristic = kind === "refusal" ? gradeRefusalHeuristic(t.text) : null;
          grades[kind] = { pass: judgePasses(j.verdict, kind) && (heuristic?.pass ?? true), detail: { verdict: j.verdict, heuristic } };
        }
        const r: CaseResult = {
          id: c.id,
          rep,
          question: c.question,
          checks: c.checks,
          answer: t.text,
          toolCalls: t.toolCalls.map(({ name, input, isError }) => ({ name, input, isError })),
          toolResults,
          stopReason: t.stopReason,
          servedModels: t.servedModels,
          usage: { inputTokens: t.usage.inputTokens, outputTokens: t.usage.outputTokens },
          judgeUsage,
          grades,
          pass: Object.values(grades).every((g) => g.pass),
        };
        results.push(r);
        console.log(r.pass ? "PASS" : `FAIL (${Object.entries(grades).filter(([, g]) => !g.pass).map(([k]) => k).join(", ")})`);
      } catch (e) {
        // Infra failures are kept apart from model failures (never scored as a fail).
        errors.push({ id: c.id, rep, error: e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : (e as Error).message });
        console.log("ERROR (not scored)");
      }
    }

  const run: RunFile = { runAt: new Date().toISOString(), tutorModel, judgeModel, reps, results, errors, totals: totals(results, tutorModel, judgeModel) };
  await mkdir(RESULTS_DIR, { recursive: true });
  await writeFile(LATEST, JSON.stringify(run, null, 1) + "\n");
  await writeFile(path.join(RESULTS_DIR, "summary.md"), summary(run));
  console.log("\n" + summary(run));
}

function summary(run: RunFile): string {
  const t = run.totals;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "n/a");
  const lines = [
    `# Tutor eval results`,
    ``,
    `Run: ${run.runAt} · tutor \`${run.tutorModel}\` · judge \`${run.judgeModel}\` · ${run.reps} rep(s) · fixture snapshot 2026-11-10`,
    ``,
    `**Pass rate: ${t.passed}/${t.cases} (${pct(t.passed, t.cases)})**${run.errors.length ? ` · ${run.errors.length} infra error(s), not scored` : ""}`,
    ``,
    `| Check | Passed |`,
    `|---|---|`,
    ...Object.entries(t.byCheck).map(([k, v]) => `| ${k} | ${v.passed}/${v.total} (${pct(v.passed, v.total)}) |`),
    ``,
    `| Tokens | Input | Output | Cost (USD) |`,
    `|---|---|---|---|`,
    `| Tutor | ${t.tutorTokens.input.toLocaleString("en-US")} | ${t.tutorTokens.output.toLocaleString("en-US")} | $${t.costUsd.tutor.toFixed(4)} |`,
    `| Judge | ${t.judgeTokens.input.toLocaleString("en-US")} | ${t.judgeTokens.output.toLocaleString("en-US")} | $${t.costUsd.judge.toFixed(4)} |`,
    `| **Total** | | | **$${t.costUsd.total.toFixed(4)}** |`,
    ``,
    `## Failures`,
    ``,
    ...(run.results.filter((r) => !r.pass).length
      ? run.results
          .filter((r) => !r.pass)
          .map((r) => {
            const failed = Object.entries(r.grades).filter(([, g]) => !g.pass);
            return `- **${r.id}**: ${failed.map(([k, g]) => `${k} (${JSON.stringify(g.detail).slice(0, 300)})`).join("; ")}`;
          })
      : ["None."]),
    ``,
  ];
  return lines.join("\n");
}

async function dry() {
  let failures = 0;
  // 1. Tool wiring on fixture data: every tool runs and returns JSON.
  const db = await fixtureDb();
  const data = dbTutorData(db);
  const samples: Record<string, unknown> = {
    search_players: { query: "gibbs" },
    get_player: { player_id: "9221" },
    get_price_history: { player_id: "9221", days: 30 },
    get_market_movers: { kind: "gainers_30d", limit: 3 },
    get_sleeper_portfolio: { username: "johnrog" },
    get_stock_match: { player_id: "9221" },
    get_glossary_term: { term: "volume" },
    get_lesson: { lesson_id: "volatility" },
  };
  for (const def of TOOL_DEFINITIONS) {
    const r = await runTool(def.name, samples[def.name], data);
    let ok = !r.isError;
    try {
      const parsed = JSON.parse(r.content) as { error?: string };
      if (parsed.error) ok = false;
    } catch {
      ok = false;
    }
    console.log(`${ok ? "ok  " : "FAIL"} tool ${def.name}`);
    if (!ok) failures++;
  }
  const bad = await runTool("get_player", { player_id: 42 }, data);
  console.log(`${bad.isError ? "ok  " : "FAIL"} invalid tool input is rejected`);
  if (!bad.isError) failures++;

  // 2. Every case is well-formed.
  for (const c of CASES) {
    const ok = c.checks.length > 0 && (!c.checks.includes("judge") || Boolean(c.rubric)) && (!c.checks.includes("tools") || Boolean(c.expectTools?.length));
    if (!ok) {
      console.log(`FAIL case ${c.id} is missing a rubric or expected tools`);
      failures++;
    }
  }
  console.log(`ok   ${CASES.length} cases well-formed`);

  // 3. Re-grade the recorded run with the current code graders (no API calls).
  try {
    const run = JSON.parse(await readFile(LATEST, "utf8")) as RunFile;
    let changed = 0;
    for (const r of run.results) {
      const c = CASES.find((x) => x.id === r.id);
      if (!c) continue;
      const g = codeGrades(c, r.answer, r.toolCalls, r.toolResults);
      for (const k of Object.keys(g) as Check[]) if (g[k]!.pass !== r.grades[k]?.pass) changed++;
    }
    console.log(`ok   recorded run ${run.runAt}: ${run.totals.passed}/${run.totals.cases} passed (${Math.round(run.totals.passRate * 100)}%), $${run.totals.costUsd.total.toFixed(4)}`);
    console.log(`${changed ? "note" : "ok  "} re-grading recorded answers with current code graders: ${changed} verdict(s) differ`);
  } catch {
    console.log("note no recorded run yet (evals/results/latest.json); run `npm run eval` once with an API key");
  }
  if (failures) process.exit(1);
}

function estimate() {
  const n = CASES.length;
  const judged = CASES.filter((c) => c.checks.includes("judge") || c.checks.includes("refusal")).length;
  // Assumptions (see docs/decisions/0005): ~3 tutor calls per case at ~4k input / ~500 output tokens each,
  // one judge call per judged check at ~3k input / ~600 output tokens.
  const tutor = costUsd(DEFAULT_TUTOR_MODEL, n * 3 * 4000, n * 3 * 500);
  const judge = costUsd(DEFAULT_JUDGE, judged * 3000, judged * 600);
  console.log(`${n} cases, ${judged} judged. Estimated: tutor $${tutor.toFixed(3)} + judge $${judge.toFixed(3)} = $${(tutor + judge).toFixed(3)} per rep.`);
}

const main = args.has("dry") ? dry : args.has("estimate") ? async () => estimate() : full;
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
