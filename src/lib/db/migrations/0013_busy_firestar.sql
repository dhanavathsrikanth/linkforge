CREATE TABLE "link_gallery_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" uuid NOT NULL,
	"block_id" uuid,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"data" text NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "link_gallery_assets" ADD CONSTRAINT "link_gallery_assets_gallery_id_link_gallery_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."link_gallery"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "lga_gallery_idx" ON "link_gallery_assets" USING btree ("gallery_id");
--> statement-breakpoint
CREATE INDEX "lga_block_idx" ON "link_gallery_assets" USING btree ("block_id");
--> statement-breakpoint
CREATE INDEX "lga_filename_idx" ON "link_gallery_assets" USING btree ("filename");
