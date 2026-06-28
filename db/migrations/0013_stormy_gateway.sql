CREATE TABLE "cash_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"platform_id" text NOT NULL,
	"symbol_id" text,
	"event_type" text NOT NULL,
	"event_date" date NOT NULL,
	"amount" numeric(16, 4) NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"fx_rate" numeric(18, 8),
	"source_system" text,
	"source_row_hash" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_events_user_source_row_unique" UNIQUE("user_id","source_system","source_row_hash")
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"platform_id" text NOT NULL,
	"source_system" text NOT NULL,
	"file_name" text NOT NULL,
	"file_hash" text NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'imported' NOT NULL,
	"summary_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"row_hash" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"confidence" numeric(5, 4),
	"raw_json" text NOT NULL,
	"normalized_json" text,
	"matched_trade_id" text,
	"matched_cash_event_id" text,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_rows_batch_row_unique" UNIQUE("batch_id","row_index")
);
--> statement-breakpoint
ALTER TABLE "trade_lot_matches" ALTER COLUMN "matched_quantity" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "trades" ALTER COLUMN "quantity" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "trades" ADD COLUMN "source_system" text;--> statement-breakpoint
ALTER TABLE "trades" ADD COLUMN "source_row_hash" text;--> statement-breakpoint
ALTER TABLE "trades" ADD COLUMN "imported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cash_events" ADD CONSTRAINT "cash_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_events" ADD CONSTRAINT "cash_events_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_events" ADD CONSTRAINT "cash_events_symbol_id_symbols_id_fk" FOREIGN KEY ("symbol_id") REFERENCES "public"."symbols"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_matched_trade_id_trades_id_fk" FOREIGN KEY ("matched_trade_id") REFERENCES "public"."trades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_matched_cash_event_id_cash_events_id_fk" FOREIGN KEY ("matched_cash_event_id") REFERENCES "public"."cash_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_events_user_date_idx" ON "cash_events" USING btree ("user_id","event_date");--> statement-breakpoint
CREATE INDEX "cash_events_user_platform_idx" ON "cash_events" USING btree ("user_id","platform_id");--> statement-breakpoint
CREATE INDEX "cash_events_user_symbol_idx" ON "cash_events" USING btree ("user_id","symbol_id");--> statement-breakpoint
CREATE INDEX "import_batches_user_created_idx" ON "import_batches" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "import_rows_batch_status_idx" ON "import_rows" USING btree ("batch_id","status");--> statement-breakpoint
CREATE INDEX "import_rows_hash_idx" ON "import_rows" USING btree ("row_hash");--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_source_row_unique" UNIQUE("user_id","source_system","source_row_hash");