import { z } from 'zod';
import { procedure, t } from '../trpc.js';
import { csvColumnMappingSchema, temporalPrecisionSchema } from '../types/spatiotemporal.js';
import { db } from '../db/index.js';
import { dataPoint, dataLayer, collection } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { parseCSV } from '../import/csv.js';
import { parseGeoJSON } from '../import/geojson.js';
import { fetchAndTransform } from '../import/apiFetch.js';
import { invalidateCollectionCache } from '../utils/cache.js';
import type { DataPointInput } from '../import/types.js';

/**
 * Asserts that the given layer exists and belongs to a collection owned by the specified user.
 * Returns the collectionId for cache invalidation.
 */
async function assertLayerOwnership(layerId: string, ownerId: string): Promise<string> {
  const [layer] = await db
    .select()
    .from(dataLayer)
    .where(eq(dataLayer.id, layerId));

  if (!layer) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Data layer not found',
    });
  }

  const [col] = await db
    .select()
    .from(collection)
    .where(eq(collection.id, layer.collectionId));

  if (!col) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Collection not found',
    });
  }

  if (col.ownerId !== ownerId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access denied',
    });
  }

  return layer.collectionId;
}

/**
 * Bulk inserts data points into the specified layer using ST_GeomFromGeoJSON.
 */
async function bulkInsertPoints(layerId: string, points: DataPointInput[]): Promise<void> {
  for (const point of points) {
    await db.insert(dataPoint).values({
      layerId,
      geometry: sql`ST_GeomFromGeoJSON(${JSON.stringify(point.geometry)})`,
      timestamp: new Date(point.timestamp),
      temporalPrecision: point.temporalPrecision,
      value: point.value,
      metadata: point.metadata ?? null,
      mediaUrl: null,
    });
  }
}

export const importRouter = t.router({
  csv: procedure
    .input(
      z.object({
        layerId: z.string().uuid(),
        content: z.string(),
        mapping: csvColumnMappingSchema,
        ownerId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const collectionId = await assertLayerOwnership(input.layerId, input.ownerId);

      const { points, errors } = parseCSV(input.content, input.mapping);

      await bulkInsertPoints(input.layerId, points);
      await invalidateCollectionCache(collectionId);

      return {
        success: points.length,
        skipped: errors,
        total: points.length + errors.length,
      };
    }),

  geojson: procedure
    .input(
      z.object({
        layerId: z.string().uuid(),
        content: z.string(),
        timestampField: z.string().optional(),
        defaultTimestamp: z.string().optional(),
        temporalPrecision: temporalPrecisionSchema.optional(),
        ownerId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const collectionId = await assertLayerOwnership(input.layerId, input.ownerId);

      const { points, errors } = parseGeoJSON(
        input.content,
        input.timestampField,
        input.defaultTimestamp,
        input.temporalPrecision
      );

      await bulkInsertPoints(input.layerId, points);
      await invalidateCollectionCache(collectionId);

      return {
        success: points.length,
        skipped: errors,
        total: points.length + errors.length,
      };
    }),

  apiFetch: procedure
    .input(
      z.object({
        layerId: z.string().uuid(),
        url: z.string().url(),
        fieldMapping: z.record(z.string()),
        ownerId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const collectionId = await assertLayerOwnership(input.layerId, input.ownerId);

      const points = await fetchAndTransform(input.url, input.fieldMapping);

      await bulkInsertPoints(input.layerId, points);
      await invalidateCollectionCache(collectionId);

      return {
        success: points.length,
        skipped: [] as Array<{ row: number; reason: string }>,
        total: points.length,
      };
    }),
});
