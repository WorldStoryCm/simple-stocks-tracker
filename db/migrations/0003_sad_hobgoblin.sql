ALTER TABLE "symbols" ADD COLUMN "sector" text;--> statement-breakpoint
ALTER TABLE "symbols" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "symbols" ADD COLUMN "metadata_synced_at" timestamp with time zone;