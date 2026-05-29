ALTER TABLE "clicks" ADD COLUMN "is_deep_link" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "uri_scheme" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "ios_app_store_id" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "android_play_store_id" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "ios_bundle_id" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "android_package_name" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "sha256_cert_fingerprints" text[] DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "universal_links_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "app_links_enabled" boolean DEFAULT false NOT NULL;