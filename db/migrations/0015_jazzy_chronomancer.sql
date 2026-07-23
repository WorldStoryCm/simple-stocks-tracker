CREATE TABLE "trading_session_events" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"event_type" text NOT NULL,
	"executed_at" timestamp with time zone NOT NULL,
	"quantity" numeric(18, 8) NOT NULL,
	"price" numeric(16, 4) NOT NULL,
	"fee" numeric(12, 4) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_session_opening_lots" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"source_trade_id" text,
	"acquired_at" timestamp with time zone,
	"quantity" numeric(18, 8) NOT NULL,
	"unit_price" numeric(16, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"platform_id" text NOT NULL,
	"symbol_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"opening_source" text NOT NULL,
	"opening_quantity" numeric(18, 8) NOT NULL,
	"opening_total_cost" numeric(18, 4) NOT NULL,
	"opening_market_price" numeric(16, 4) NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trading_session_events" ADD CONSTRAINT "trading_session_events_session_id_trading_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."trading_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_session_opening_lots" ADD CONSTRAINT "trading_session_opening_lots_session_id_trading_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."trading_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_session_opening_lots" ADD CONSTRAINT "trading_session_opening_lots_source_trade_id_trades_id_fk" FOREIGN KEY ("source_trade_id") REFERENCES "public"."trades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_sessions" ADD CONSTRAINT "trading_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_sessions" ADD CONSTRAINT "trading_sessions_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_sessions" ADD CONSTRAINT "trading_sessions_symbol_id_symbols_id_fk" FOREIGN KEY ("symbol_id") REFERENCES "public"."symbols"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trading_session_events_session_time_idx" ON "trading_session_events" USING btree ("session_id","executed_at");--> statement-breakpoint
CREATE INDEX "trading_session_opening_lots_session_idx" ON "trading_session_opening_lots" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "trading_sessions_user_status_idx" ON "trading_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "trading_sessions_user_symbol_idx" ON "trading_sessions" USING btree ("user_id","symbol_id");