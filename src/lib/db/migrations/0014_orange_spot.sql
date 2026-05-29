CREATE TABLE "link_gallery_block_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"block_type" text NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip" text,
	"country" text,
	"device" text,
	"referrer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "link_gallery_block_events" ADD CONSTRAINT "link_gallery_block_events_gallery_id_link_gallery_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."link_gallery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_gallery_block_events" ADD CONSTRAINT "link_gallery_block_events_block_id_link_gallery_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."link_gallery_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lgbe_gallery_idx" ON "link_gallery_block_events" USING btree ("gallery_id");--> statement-breakpoint
CREATE INDEX "lgbe_block_idx" ON "link_gallery_block_events" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "lgbe_type_idx" ON "link_gallery_block_events" USING btree ("block_type","event_type");--> statement-breakpoint
CREATE INDEX "lgbe_created_at_idx" ON "link_gallery_block_events" USING btree ("created_at");