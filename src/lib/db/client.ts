/**
 * Database client.
 * - DATABASE_URL set (Docker Postgres locally, Neon in production): postgres.js driver.
 * - DATABASE_URL empty: embedded PGlite (Postgres compiled to WASM) in ./.data/pglite,
 *   so the app and tests run without Docker. Same schema, same SQL.
 */
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

let dbPromise: Promise<Db> | undefined;

export function getDb(): Promise<Db> {
  dbPromise ??= createDb(process.env.DATABASE_URL);
  return dbPromise;
}

export async function createDb(url: string | undefined): Promise<Db> {
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const sql = postgres(url, { max: 5, prepare: false });
    return drizzle(sql, { schema }) as unknown as Db;
  }
  return createPgliteDb(process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite"));
}

/** `dataDir` "memory://" gives an in-memory database (used by tests). */
export async function createPgliteDb(dataDir: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (!dataDir.startsWith("memory://")) {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(dataDir, { recursive: true });
  }
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = await PGlite.create(dataDir);
  return drizzle(client, { schema }) as unknown as Db;
}

export async function migrateDb(db: Db, url = process.env.DATABASE_URL): Promise<void> {
  if (url) {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db as never, { migrationsFolder: MIGRATIONS_DIR });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder: MIGRATIONS_DIR });
  }
}
