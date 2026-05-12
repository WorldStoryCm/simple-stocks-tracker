CREATE TABLE "ticker_catalog" (
	"symbol" text PRIMARY KEY NOT NULL,
	"name" text,
	"exchange" text,
	"market_category" text,
	"is_etf" boolean DEFAULT false NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ticker_catalog_symbol_idx" ON "ticker_catalog" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "ticker_catalog_exchange_idx" ON "ticker_catalog" USING btree ("exchange");