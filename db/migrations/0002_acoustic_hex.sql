ALTER TABLE "goals" ALTER COLUMN "goal_type" SET DEFAULT 'monthly_profit';--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "cash_balance" numeric(14, 2) DEFAULT '0' NOT NULL;