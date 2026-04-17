CREATE TABLE "capital_progress_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"currency_code" text DEFAULT 'EUR' NOT NULL,
	"target_amount" numeric(14, 2) DEFAULT '100000' NOT NULL,
	"manual_contribution_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capital_progress_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "capital_progress_settings" ADD CONSTRAINT "capital_progress_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;