/**
 * Database schema. Multi-sport by design: every row carries `sport`, so a Fantasy Premier
 * League mode can be added later without schema changes (only "nfl" exists today).
 */
import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const sportEnum = pgEnum("sport", ["nfl"]);
export const valueFormatEnum = pgEnum("value_format", ["dynasty", "redraft"]);

export const players = pgTable(
  "players",
  {
    sport: sportEnum("sport").notNull(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    position: text("position"),
    team: text("team"),
    age: real("age"),
    yearsExp: integer("years_exp"),
    status: text("status"),
    injuryStatus: text("injury_status"),
    injuryStartDate: text("injury_start_date"),
    injuryBodyPart: text("injury_body_part"),
    injuryNotes: text("injury_notes"),
    depthChartOrder: integer("depth_chart_order"),
    searchRank: integer("search_rank"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sport, t.externalId] })],
);

/** The price history: one row per player, format and day. */
export const valueSnapshots = pgTable(
  "value_snapshots",
  {
    sport: sportEnum("sport").notNull(),
    playerId: text("player_id").notNull(),
    format: valueFormatEnum("format").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    source: text("source").notNull(),
    value: integer("value").notNull(),
    overallRank: integer("overall_rank"),
    positionRank: integer("position_rank"),
    trend30Day: integer("trend_30_day"),
    /** true for the one point derived from FantasyCalc's 30-day trend (see ADR 0002). */
    derived: boolean("derived").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.sport, t.playerId, t.format, t.date] })],
);

/** "Volume": Sleeper trending adds/drops over the last 24h, one row per player per day. */
export const trendingSnapshots = pgTable(
  "trending_snapshots",
  {
    sport: sportEnum("sport").notNull(),
    playerId: text("player_id").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    adds: integer("adds").notNull().default(0),
    drops: integer("drops").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.sport, t.playerId, t.date] })],
);

export const companyValues = pgTable("company_values", {
  ticker: text("ticker").primaryKey(),
  cik: integer("cik").notNull(),
  name: text("name").notNull(),
  valueUsd: bigint("value_usd", { mode: "number" }).notNull(),
  asOf: date("as_of", { mode: "string" }).notNull(),
  form: text("form"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Observability for the daily job. */
export const ingestRuns = pgTable("ingest_runs", {
  id: serial("id").primaryKey(),
  job: text("job").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull(),
  counts: jsonb("counts").$type<Record<string, number>>(),
  error: text("error"),
});
