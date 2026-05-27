import { z } from 'zod';
import { procedure, t } from '../trpc.js';
import { createDataLayerSchema, renderTypeSchema, projectionSchema, sourceModeSchema, itemFilterSchema } from '../types/spatiotemporal.js';
import { db } from '../db/index.js';
import { collection, dataLayer } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Asserts that the given collection exists and is owned by the specified user.
 * Throws NOT_FOUND if the collection does not exist.
 * Throws FORBIDDEN if the collection is owned by a different user.
 */
async function assertCollectionOwnership(collectionId: string, ownerId: string): Promise<void> {
  const [found] = await db
    .select()
    .from(collection)
    .where(eq(collection.id, collectionId));

  if (!found) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Collection not found',
    });
  }

  if (found.ownerId !== ownerId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access denied',
    });
  }
}

/**
 * Looks up a data layer by ID and asserts ownership of its parent collection.
 * Throws NOT_FOUND if the layer does not exist.
 * Throws FORBIDDEN if the parent collection is owned by a different user.
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

  await assertCollectionOwnership(layer.collectionId, ownerId);
  return layer.collectionId;
}

export const dataLayerRouter = t.router({
  list: procedure
    .input(z.object({
      collectionId: z.string().uuid(),
      ownerId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      await assertCollectionOwnership(input.collectionId, input.ownerId);
      return db.select().from(dataLayer).where(eq(dataLayer.collectionId, input.collectionId));
    }),

  create: procedure
    .input(createDataLayerSchema.extend({ ownerId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await assertCollectionOwnership(input.collectionId, input.ownerId);
      const { ownerId, ...layerData } = input;
      const [result] = await db.insert(dataLayer).values({
        collectionId: layerData.collectionId,
        name: layerData.name,
        renderType: layerData.renderType,
        projection: layerData.projection ?? 'globe',
        schemaHint: layerData.schemaHint ?? null,
        sourceMode: layerData.sourceMode ?? 'data_points',
        itemFilter: layerData.itemFilter ?? null,
      }).returning();
      return result;
    }),

  update: procedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      renderType: renderTypeSchema.optional(),
      projection: projectionSchema.optional(),
      sourceMode: sourceModeSchema.optional(),
      itemFilter: itemFilterSchema,
      ownerId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      await assertLayerOwnership(input.id, input.ownerId);
      const { id, ownerId, ...updates } = input;
      const [result] = await db.update(dataLayer)
        .set(updates)
        .where(eq(dataLayer.id, id))
        .returning();
      return result;
    }),

  delete: procedure
    .input(z.object({
      id: z.string().uuid(),
      ownerId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      await assertLayerOwnership(input.id, input.ownerId);
      await db.delete(dataLayer).where(eq(dataLayer.id, input.id));
      return { success: true };
    }),
});
