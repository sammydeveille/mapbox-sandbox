import { pgTable, uuid, varchar, text, timestamp, doublePrecision, jsonb, index, customType } from 'drizzle-orm/pg-core';

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
  schemaHint: jsonb('schema_hint'),
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
