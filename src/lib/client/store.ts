"use client";
/**
 * Learner state in the browser (no accounts, nothing on the server).
 * localStorage can be unavailable (private mode, blocked storage), so every access is guarded
 * and the app still works with in-memory state.
 */
import { useCallback, useSyncExternalStore } from "react";
import { z } from "zod";
import { initialPaperState, parsePaperState, type PaperState } from "@/lib/domain/paper";

const listeners = new Set<() => void>();
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    if (value === null) memory.delete(key);
    else memory.set(key, value);
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function useStored(key: string): [string | null, (v: string | null) => void] {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const set = useCallback((v: string | null) => write(key, v), [key]);
  return [raw, set];
}

// ---------- progress ----------

const progressSchema = z.object({
  onboarded: z.boolean().default(false),
  learnMode: z.boolean().default(true),
  lessons: z.record(z.string(), z.object({ score: z.number(), total: z.number(), at: z.string() })).default({}),
});
export type Progress = z.output<typeof progressSchema>;
const DEFAULT_PROGRESS: Progress = { onboarded: false, learnMode: true, lessons: {} };

const progressCache = new Map<string | null, Progress>();
function parseProgress(raw: string | null): Progress {
  const hit = progressCache.get(raw);
  if (hit) return hit;
  let p = DEFAULT_PROGRESS;
  try {
    if (raw) {
      const r = progressSchema.safeParse(JSON.parse(raw));
      if (r.success) p = r.data;
    }
  } catch {
    /* keep default */
  }
  progressCache.set(raw, p);
  return p;
}

export function useProgress() {
  const [raw, set] = useStored("fsx:progress");
  const progress = parseProgress(raw);
  const update = useCallback(
    (fn: (p: Progress) => Progress) => set(JSON.stringify(fn(parseProgress(read("fsx:progress"))))),
    [set],
  );
  const reset = useCallback(() => set(null), [set]);
  return { progress, update, reset };
}

// ---------- paper portfolio ----------

const paperCache = new Map<string | null, PaperState>();
function cachedPaper(raw: string | null): PaperState {
  const hit = paperCache.get(raw);
  if (hit) return hit;
  const p = parsePaperState(raw);
  paperCache.set(raw, p);
  return p;
}

export function usePaper() {
  const [raw, set] = useStored("fsx:paper");
  const state = cachedPaper(raw);
  const save = useCallback((s: PaperState) => set(JSON.stringify(s)), [set]);
  const reset = useCallback(() => set(JSON.stringify(initialPaperState())), [set]);
  return { state, save, reset };
}
