import { z } from "zod";

export class SourceError extends Error {
  constructor(
    message: string,
    readonly source: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

export interface FetchJsonOptions {
  /** Short name used in errors and logs, e.g. "sleeper". */
  source: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Passed to Next's fetch for request-level caching (seconds). */
  revalidate?: number;
}

/** Fetch a URL and return its JSON body as `unknown`. Validation is the caller's job. */
export async function fetchJson(url: string, opts: FetchJsonOptions): Promise<unknown> {
  const { source, timeoutMs = 15_000, headers, revalidate } = opts;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json", ...headers },
      signal: AbortSignal.timeout(timeoutMs),
      ...(revalidate !== undefined ? { next: { revalidate } } : {}),
    } as RequestInit);
  } catch (err) {
    throw new SourceError(`${source}: request failed (${(err as Error).message})`, source);
  }
  if (!res.ok) {
    throw new SourceError(`${source}: HTTP ${res.status} for ${new URL(url).pathname}`, source, res.status);
  }
  return res.json();
}

/** Parse with a schema and throw a readable error that names the source. */
export function parseOrThrow<T extends z.ZodType>(schema: T, data: unknown, source: string): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new SourceError(`${source}: unexpected response shape: ${z.prettifyError(result.error)}`, source);
  }
  return result.data;
}

/**
 * Validate an array item by item: keep valid rows, count invalid ones.
 * External data is never trusted wholesale, but one bad row should not sink a whole import.
 */
export function parseRows<T extends z.ZodType>(
  schema: T,
  rows: unknown,
): { valid: z.output<T>[]; invalid: number } {
  if (!Array.isArray(rows)) return { valid: [], invalid: 0 };
  const valid: z.output<T>[] = [];
  let invalid = 0;
  for (const row of rows) {
    const r = schema.safeParse(row);
    if (r.success) valid.push(r.data);
    else invalid++;
  }
  return { valid, invalid };
}
