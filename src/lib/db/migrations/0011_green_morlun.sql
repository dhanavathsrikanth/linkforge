ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'initializing' BEFORE 'pending_validation';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'pending_deployment' BEFORE 'active';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'pending_deletion' BEFORE 'active';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'pending_expiration' BEFORE 'active';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'expired' BEFORE 'active';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'initializing_timed_out' BEFORE 'deleted';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'validation_timed_out' BEFORE 'deleted';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'issuance_timed_out' BEFORE 'deleted';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'deployment_timed_out' BEFORE 'deleted';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'deletion_timed_out' BEFORE 'deleted';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'pending_cleanup' BEFORE 'deleted';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'staging_deployment' BEFORE 'deleted';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'staging_active' BEFORE 'deleted';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'deactivating' BEFORE 'deleted';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'inactive' BEFORE 'deleted';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'backup_issued' BEFORE 'deleted';--> statement-breakpoint
ALTER TYPE "public"."cf_ssl_status" ADD VALUE 'holding_deployment' BEFORE 'deleted';--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "cf_hostname_status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."cf_hostname_status";--> statement-breakpoint
CREATE TYPE "public"."cf_hostname_status" AS ENUM('pending', 'active', 'active_redeploying', 'moved', 'pending_deletion', 'deleted', 'pending_blocked', 'pending_migration', 'pending_provisioned', 'test_pending', 'test_active', 'test_active_apex', 'test_blocked', 'test_failed', 'provisioned', 'blocked');--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "cf_hostname_status" SET DATA TYPE "public"."cf_hostname_status" USING "cf_hostname_status"::"public"."cf_hostname_status";--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "cf_ownership_verification" jsonb;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "cf_ownership_verification_http" jsonb;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "cf_verification_errors" jsonb;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "cf_ssl_validation_errors" jsonb;