CREATE TABLE "collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"temporal_start" timestamp with time zone,
	"temporal_end" timestamp with time zone,
	"spatial_bounds" geometry(Geometry, 4326),
	"presentation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_layer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"render_type" varchar(20) NOT NULL,
	"projection" varchar(10) DEFAULT 'globe' NOT NULL,
	"source_mode" varchar(20) DEFAULT 'data_points' NOT NULL,
	"item_filter" jsonb,
	"schema_hint" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_point" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"layer_id" uuid NOT NULL,
	"geometry" geometry(Geometry, 4326) NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"temporal_precision" varchar(10) NOT NULL,
	"value" double precision NOT NULL,
	"metadata" jsonb,
	"media_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_item_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"relevance" varchar(20) NOT NULL,
	"excerpt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_evidence_relevance_check" CHECK ("item_evidence"."relevance" IN ('primary', 'supporting', 'contextual'))
);
--> statement-breakpoint
CREATE TABLE "item_place" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_item_id" uuid NOT NULL,
	"geometry" geometry(Geometry, 4326) NOT NULL,
	"place_name" varchar(255),
	"precision" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_place_precision_check" CHECK ("item_place"."precision" IN ('exact', 'approximate', 'region'))
);
--> statement-breakpoint
CREATE TABLE "item_time" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_item_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"precision" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_time_precision_check" CHECK ("item_time"."precision" IN ('year', 'month', 'day', 'hour', 'exact')),
	CONSTRAINT "item_time_range_check" CHECK ("item_time"."end_time" IS NULL OR "item_time"."start_time" <= "item_time"."end_time")
);
--> statement-breakpoint
CREATE TABLE "knowledge_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"summary" text NOT NULL,
	"item_type" varchar(20) NOT NULL,
	"content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_item_type_check" CHECK ("knowledge_item"."item_type" IN ('article', 'event', 'statistic', 'concept', 'place'))
);
--> statement-breakpoint
CREATE TABLE "presentation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid,
	"owner_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presentation_slide" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"presentation_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" varchar(255),
	"narrator_note" text,
	"view_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slide_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slide_id" uuid NOT NULL,
	"knowledge_item_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"annotation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"base_url" text NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "source_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" varchar(500) NOT NULL,
	"raw_content" jsonb NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_owner_id_user_profile_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_layer" ADD CONSTRAINT "data_layer_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_point" ADD CONSTRAINT "data_point_layer_id_data_layer_id_fk" FOREIGN KEY ("layer_id") REFERENCES "public"."data_layer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_evidence" ADD CONSTRAINT "item_evidence_knowledge_item_id_knowledge_item_id_fk" FOREIGN KEY ("knowledge_item_id") REFERENCES "public"."knowledge_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_evidence" ADD CONSTRAINT "item_evidence_source_document_id_source_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_place" ADD CONSTRAINT "item_place_knowledge_item_id_knowledge_item_id_fk" FOREIGN KEY ("knowledge_item_id") REFERENCES "public"."knowledge_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_time" ADD CONSTRAINT "item_time_knowledge_item_id_knowledge_item_id_fk" FOREIGN KEY ("knowledge_item_id") REFERENCES "public"."knowledge_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentation" ADD CONSTRAINT "presentation_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentation" ADD CONSTRAINT "presentation_owner_id_user_profile_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentation_slide" ADD CONSTRAINT "presentation_slide_presentation_id_presentation_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."presentation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slide_item" ADD CONSTRAINT "slide_item_slide_id_presentation_slide_id_fk" FOREIGN KEY ("slide_id") REFERENCES "public"."presentation_slide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slide_item" ADD CONSTRAINT "slide_item_knowledge_item_id_knowledge_item_id_fk" FOREIGN KEY ("knowledge_item_id") REFERENCES "public"."knowledge_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_document" ADD CONSTRAINT "source_document_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_collection_owner_id" ON "collection" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_data_point_timestamp" ON "data_point" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_data_point_layer_id" ON "data_point" USING btree ("layer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_source_document_source_external" ON "source_document" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "idx_source_document_content_hash" ON "source_document" USING btree ("content_hash");
--> statement-breakpoint
CREATE INDEX idx_knowledge_item_fts ON knowledge_item USING GIN (to_tsvector('english', title || ' ' || summary || ' ' || COALESCE(content, '')));
--> statement-breakpoint
CREATE INDEX idx_item_place_geometry ON item_place USING gist (geometry);
