import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { procedure, t } from '../trpc.js';
import { createDataPointSchema, spatialTemporalQuerySchema } from '../types/spatiotemporal.js';
import { db } from '../db/index.js';
import { dataPoint, dataLayer } from '../db/schema.js';
import { buildCacheKey, getCached, setCache, invalidateCollectionCache } from '../utils/cache.js';

export const dataPointRouter = t.router({
  create: procedure
    .input(createDataPointSchema)
    .mutation(async ({ input }) => {
      const geomSql = sql`ST_GeomFromGeoJSON(${JSON.stringify(input.geometry)})`;
      const [result] = await db.insert(dataPoint).values({
        layerId: input.layerId,
        geometry: geomSql,
        timestamp: new Date(input.timestamp),
        temporalPrecision: input.temporalPrecision,
        value: input.value,
        metadata: input.metadata ?? null,
        mediaUrl: input.mediaUrl ?? null,
      }).returning();

      // Invalidate cache for the collection this layer belongs to
      const [layer] = await db.select().from(dataLayer).where(eq(dataLayer.id, input.layerId));
      if (layer) await invalidateCollectionCache(layer.collectionId);

      return result;
    }),

  query: procedure
    .input(spatialTemporalQuerySchema)
    .query(async ({ input }) => {
      type QueryResult = {
        id: string;
        layerId: string;
        geometry: unknown;
        timestamp: Date;
        temporalPrecision: string;
        value: number;
        metadata: unknown;
        mediaUrl: string | null;
        createdAt: Date;
      }[];

      const cacheKey = buildCacheKey(input);
      const cached = await getCached<QueryResult>(cacheKey);
      if (cached) return cached;

      // Build query conditions
      const conditions = [];

      // Layer filter
      conditions.push(
        sql`${dataPoint.layerId} IN (${sql.join(input.layerIds.map(id => sql`${id}`), sql`, `)})`
      );

      // Bbox filter using ST_Intersects
      if (input.bbox) {
        const [west, south, east, north] = input.bbox;
        conditions.push(
          sql`ST_Intersects(${dataPoint.geometry}, ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326))`
        );
      }

      // Radius filter using ST_DWithin
      if (input.center && input.radius) {
        const [lng, lat] = input.center;
        conditions.push(
          sql`ST_DWithin(${dataPoint.geometry}::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${input.radius})`
        );
      }

      // Time range filter
      if (input.timeStart) {
        conditions.push(sql`${dataPoint.timestamp} >= ${new Date(input.timeStart)}`);
      }
      if (input.timeEnd) {
        conditions.push(sql`${dataPoint.timestamp} <= ${new Date(input.timeEnd)}`);
      }

      const results = await db.select({
        id: dataPoint.id,
        layerId: dataPoint.layerId,
        geometry: sql<string>`ST_AsGeoJSON(${dataPoint.geometry})`.as('geometry'),
        timestamp: dataPoint.timestamp,
        temporalPrecision: dataPoint.temporalPrecision,
        value: dataPoint.value,
        metadata: dataPoint.metadata,
        mediaUrl: dataPoint.mediaUrl,
        createdAt: dataPoint.createdAt,
      }).from(dataPoint)
        .where(sql.join(conditions, sql` AND `));

      // Parse geometry JSON strings into objects
      const parsed = results.map(r => ({
        ...r,
        geometry: JSON.parse(r.geometry as string),
      }));

      await setCache(cacheKey, parsed);
      return parsed;
    }),

  delete: procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // Look up the data point to find its layer, then invalidate cache
      const [point] = await db.select().from(dataPoint).where(eq(dataPoint.id, input.id));
      if (!point) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Data point not found' });
      }

      await db.delete(dataPoint).where(eq(dataPoint.id, input.id));

      // Invalidate cache for the collection
      const [layer] = await db.select().from(dataLayer).where(eq(dataLayer.id, point.layerId));
      if (layer) await invalidateCollectionCache(layer.collectionId);

      return { success: true };
    }),
});
