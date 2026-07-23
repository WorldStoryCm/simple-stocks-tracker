ALTER TABLE "trades" ADD COLUMN "executed_at" text;--> statement-breakpoint
ALTER TABLE "trades" ADD COLUMN "execution_order" integer;--> statement-breakpoint
CREATE INDEX "trades_user_plat_sym_execution_idx" ON "trades" USING btree ("user_id","platform_id","symbol_id","trade_date","executed_at","execution_order");--> statement-breakpoint
UPDATE "trades" AS "trade"
SET "execution_order" = CASE
	WHEN "batch"."source_system" = 'ibkr' THEN -"row"."row_index"
	ELSE "row"."row_index"
END
FROM "import_rows" AS "row"
INNER JOIN "import_batches" AS "batch" ON "batch"."id" = "row"."batch_id"
WHERE "trade"."id" = "row"."matched_trade_id"
	AND "trade"."execution_order" IS NULL;--> statement-breakpoint
UPDATE "trades" AS "trade"
SET "execution_order" = CASE
	WHEN "batch"."source_system" = 'ibkr' THEN -"row"."row_index"
	ELSE "row"."row_index"
END
FROM "import_rows" AS "row"
INNER JOIN "import_batches" AS "batch" ON "batch"."id" = "row"."batch_id"
WHERE "trade"."user_id" = "batch"."user_id"
	AND "trade"."source_system" = "batch"."source_system"
	AND "trade"."source_row_hash" = "row"."row_hash" || ':position-adjustment'
	AND "trade"."execution_order" IS NULL;
