CREATE TABLE "indicator_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ticker" text NOT NULL,
	"period" integer DEFAULT 14 NOT NULL,
	"rsi" numeric(6, 2) NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indicator_snapshots_user_ticker_period_unique" UNIQUE("user_id","ticker","period")
);
--> statement-breakpoint
ALTER TABLE "shadow_cases" ADD COLUMN "entry_rsi" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "indicator_snapshots" ADD CONSTRAINT "indicator_snapshots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "indicator_snapshots_user_ticker_idx" ON "indicator_snapshots" USING btree ("user_id","ticker");