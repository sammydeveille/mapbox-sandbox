import { pgTable, uuid, varchar, text, timestamp, doublePrecision, jsonb, integer, index, uniqueIndex, customType, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Custom column type for PostGIS geometry
export const geometry = customType<{ data: string }>({
  dataType() {
    return 'geometry(Geometry, 4326)';
  },
  toDriver(value: string) {
    return value;
  },
  fromDriver(value: unknown) {
    return value as string;
  },
});

export const userProfile = pgTable('user_profile', {
  id: uuid('id').primaryKey(),
  preferences: jsonb('preferences').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const collection = pgTable('collection', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => userProfile.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  temporalStart: timestamp('temporal_start', { withTimezone: true }),
  temporalEnd: timestamp('temporal_end', { withTimezone: true }),
  spatialBounds: geometry('spatial_bounds'),
  presentation: jsonb('presentation').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_collection_owner_id').on(table.ownerId),
]);

export const dataLayer = pgTable('data_layer', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').notNull().references(() => collection.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  renderType: varchar('render_type', { length: 20 }).notNull(),
  projection: varchar('projection', { length: 10 }).notNull().default('globe'),
  sourceMode: varchar('source_mode', { length: 20 }).notNull().default('data_points'),
  itemFilter: jsonb('item_filter'),
  schemaHint: jsonb('schema_hint'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const source = pgTable('source', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  baseUrl: text('base_url').notNull(),
  sourceType: varchar('source_type', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sourceDocument = pgTable('source_document', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').notNull().references(() => source.id),
  externalId: varchar('external_id', { length: 500 }).notNull(),
  rawContent: jsonb('raw_content').notNull(),
  contentHash: varchar('content_hash', { length: 64 }).notNull(),
  retrievedAt: timestamp('retrieved_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_source_document_source_external').on(table.sourceId, table.externalId),
  index('idx_source_document_content_hash').on(table.contentHash),
]);

export const knowledgeItem = pgTable('knowledge_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  summary: text('summary').notNull(),
  itemType: varchar('item_type', { length: 20 }).notNull(),
  content: text('content'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('knowledge_item_type_check', sql`${table.itemType} IN ('article', 'event', 'statistic', 'concept', 'place')`),
]);

export const itemEvidence = pgTable('item_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  knowledgeItemId: uuid('knowledge_item_id').notNull().references(() => knowledgeItem.id, { onDelete: 'cascade' }),
  sourceDocumentId: uuid('source_document_id').notNull().references(() => sourceDocument.id, { onDelete: 'cascade' }),
  relevance: varchar('relevance', { length: 20 }).notNull(),
  excerpt: text('excerpt'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('item_evidence_relevance_check', sql`${table.relevance} IN ('primary', 'supporting', 'contextual')`),
]);

export const itemTime = pgTable('item_time', {
  id: uuid('id').primaryKey().defaultRandom(),
  knowledgeItemId: uuid('knowledge_item_id').notNull().references(() => knowledgeItem.id, { onDelete: 'cascade' }),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  precision: varchar('precision', { length: 10 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('item_time_precision_check', sql`${table.precision} IN ('year', 'month', 'day', 'hour', 'exact')`),
  check('item_time_range_check', sql`${table.endTime} IS NULL OR ${table.startTime} <= ${table.endTime}`),
]);

export const itemPlace = pgTable('item_place', {
  id: uuid('id').primaryKey().defaultRandom(),
  knowledgeItemId: uuid('knowledge_item_id').notNull().references(() => knowledgeItem.id, { onDelete: 'cascade' }),
  geometry: geometry('geometry').notNull(),
  placeName: varchar('place_name', { length: 255 }),
  precision: varchar('precision', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('item_place_precision_check', sql`${table.precision} IN ('exact', 'approximate', 'region')`),
  // GiST index on geometry is created via raw SQL in the migration:
  // CREATE INDEX idx_item_place_geometry ON item_place USING gist (geometry);
]);

export const presentation = pgTable('presentation', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').references(() => collection.id, { onDelete: 'set null' }),
  ownerId: uuid('owner_id').notNull().references(() => userProfile.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const presentationSlide = pgTable('presentation_slide', {
  id: uuid('id').primaryKey().defaultRandom(),
  presentationId: uuid('presentation_id').notNull().references(() => presentation.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  title: varchar('title', { length: 255 }),
  narratorNote: text('narrator_note'),
  viewState: jsonb('view_state').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const slideItem = pgTable('slide_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  slideId: uuid('slide_id').notNull().references(() => presentationSlide.id, { onDelete: 'cascade' }),
  knowledgeItemId: uuid('knowledge_item_id').notNull().references(() => knowledgeItem.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  annotation: text('annotation'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dataPoint = pgTable('data_point', {
  id: uuid('id').primaryKey().defaultRandom(),
  layerId: uuid('layer_id').notNull().references(() => dataLayer.id, { onDelete: 'cascade' }),
  geometry: geometry('geometry').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  temporalPrecision: varchar('temporal_precision', { length: 10 }).notNull(),
  value: doublePrecision('value').notNull(),
  metadata: jsonb('metadata'),
  mediaUrl: text('media_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_data_point_timestamp').on(table.timestamp),
  index('idx_data_point_layer_id').on(table.layerId),
  // GiST index on geometry is created via raw SQL in the migration
]);
