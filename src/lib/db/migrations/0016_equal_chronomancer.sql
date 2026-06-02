ALTER TABLE "scan_screenshots" ALTER COLUMN "bytes" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clicks" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "conversions" ADD COLUMN "ab_variant" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "ab_test_duration_days" integer DEFAULT 14;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "ab_test_min_sample_size" integer DEFAULT 100;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "ab_test_confidence_level" numeric(3, 2) DEFAULT '0.95';--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "ab_test_auto_select_winner" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "scan_screenshots" ADD COLUMN "r2_key" text;