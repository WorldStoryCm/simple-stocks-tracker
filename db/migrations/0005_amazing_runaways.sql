CREATE TABLE "shadow_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"platform_id" text,
	"bucket" text,
	"symbol" text NOT NULL,
	"direction" text NOT NULL,
	"thesis" text NOT NULL,
	"confidence" text,
	"time_horizon" text,
	"started_at" timestamp with time zone NOT NULL,
	"entry_price" numeric(16, 4) NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"ended_at" timestamp with time zone,
	"exit_price" numeric(16, 4),
	"price_change_abs" numeric(16, 4),
	"price_change_pct" numeric(8, 4),
	"outcome" text,
	"result_summary" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shadow_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"shadow_case_id" text NOT NULL,
	"note_type" text DEFAULT 'observation_note' NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shadow_cases" ADD CONSTRAINT "shadow_cases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shadow_cases" ADD CONSTRAINT "shadow_cases_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shadow_notes" ADD CONSTRAINT "shadow_notes_shadow_case_id_shadow_cases_id_fk" FOREIGN KEY ("shadow_case_id") REFERENCES "public"."shadow_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shadow_cases_user_id_idx" ON "shadow_cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shadow_cases_user_status_idx" ON "shadow_cases" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "shadow_notes_case_id_idx" ON "shadow_notes" USING btree ("shadow_case_id");