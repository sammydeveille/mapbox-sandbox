CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE "user_profile" (
  "id" UUID PRIMARY KEY,
  "preferences" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "collection" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" UUID NOT NULL REFERENCES "user_profile"("id"),
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "temporal_start" TIMESTAMPTZ,
  "temporal_end" TIMESTAMPTZ,
  "spatial_bounds" GEOMETRY(Polygon, 4326),
  "presentation" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "data_layer" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "collection_id" UUID NOT NULL REFERENCES "collection"("id") ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "render_type" VARCHAR(20) NOT NULL CHECK ("render_type" IN ('point','heatmap','choropleth','route','cluster')),
  "schema_hint" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "data_point" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "layer_id" UUID NOT NULL REFERENCES "data_layer"("id") ON DELETE CASCADE,
  "geometry" GEOMETRY(Geometry, 4326) NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL,
  "temporal_precision" VARCHAR(10) NOT NULL CHECK ("temporal_precision" IN ('year','month','day','hour','instant')),
  "value" DOUBLE PRECISION NOT NULL,
  "metadata" JSONB,
  "media_url" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_data_point_geometry" ON "data_point" USING GIST ("geometry");
CREATE INDEX "idx_data_point_timestamp" ON "data_point" ("timestamp");
CREATE INDEX "idx_data_point_layer_id" ON "data_point" ("layer_id");
CREATE INDEX "idx_collection_owner_id" ON "collection" ("owner_id");
