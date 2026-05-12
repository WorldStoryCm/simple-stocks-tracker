ALTER TABLE "buckets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "buckets" CASCADE;--> statement-breakpoint
DROP INDEX IF EXISTS "trades_user_plat_sym_buck_date_idx";--> statement-breakpoint
CREATE INDEX "trades_user_plat_sym_date_idx" ON "trades" USING btree ("user_id","platform_id","symbol_id","trade_date");--> statement-breakpoint
ALTER TABLE "shadow_cases" DROP COLUMN "bucket";--> statement-breakpoint
ALTER TABLE "trades" DROP COLUMN "bucket_id";