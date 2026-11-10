CREATE TYPE "public"."sport" AS ENUM('nfl');--> statement-breakpoint
CREATE TYPE "public"."value_format" AS ENUM('dynasty', 'redraft');--> statement-breakpoint
CREATE TABLE "company_values" (
	"ticker" text PRIMARY KEY NOT NULL,
	"cik" integer NOT NULL,
	"name" text NOT NULL,
	"value_usd" bigint NOT NULL,
	"as_of" date NOT NULL,
	"form" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"counts" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "players" (
	"sport" "sport" NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"position" text,
	"team" text,
	"age" real,
	"years_exp" integer,
	"status" text,
	"injury_status" text,
	"injury_start_date" text,
	"injury_body_part" text,
	"injury_notes" text,
	"depth_chart_order" integer,
	"search_rank" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_sport_external_id_pk" PRIMARY KEY("sport","external_id")
);
--> statement-breakpoint
CREATE TABLE "trending_snapshots" (
	"sport" "sport" NOT NULL,
	"player_id" text NOT NULL,
	"date" date NOT NULL,
	"adds" integer DEFAULT 0 NOT NULL,
	"drops" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "trending_snapshots_sport_player_id_date_pk" PRIMARY KEY("sport","player_id","date")
);
--> statement-breakpoint
CREATE TABLE "value_snapshots" (
	"sport" "sport" NOT NULL,
	"player_id" text NOT NULL,
	"format" "value_format" NOT NULL,
	"date" date NOT NULL,
	"source" text NOT NULL,
	"value" integer NOT NULL,
	"overall_rank" integer,
	"position_rank" integer,
	"trend_30_day" integer,
	"derived" boolean DEFAULT false NOT NULL,
	CONSTRAINT "value_snapshots_sport_player_id_format_date_pk" PRIMARY KEY("sport","player_id","format","date")
);
