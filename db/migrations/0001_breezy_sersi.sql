ALTER TABLE "trades" DROP CONSTRAINT "trades_bucket_id_buckets_id_fk";
--> statement-breakpoint
ALTER TABLE "trades" ALTER COLUMN "bucket_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."buckets"("id") ON DELETE set null ON UPDATE no action;