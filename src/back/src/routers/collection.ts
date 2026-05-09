import { z } from 'zod';
import { procedure, t } from '../trpc.js';
import { createCollectionSchema, updateCollectionSchema } from '../types/spatiotemporal.js';
import { db } from '../db/index.js';
import { collection } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { ensureProfile } from '../utils/profile.js';
import { invalidateCollectionCache } from '../utils/cache.js';

/**
 * Asserts that the given collection exists and is owned by the specified user.
 * Throws NOT_FOUND if the collection does not exist.
 * Throws FORBIDDEN if the collection is owned by a different user.
 */
async function assertOwnership(collectionId: string, ownerId: string): Promise<void> {
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

export const collectionRouter = t.router({
  list: procedure
    .input(z.object({ ownerId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.select().from(collection).where(eq(collection.ownerId, input.ownerId));
    }),

  create: procedure
    .input(createCollectionSchema.extend({ ownerId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await ensureProfile(input.ownerId);
      const [result] = await db.insert(collection).values({
        ownerId: input.ownerId,
        name: input.name,
        description: input.description,
        temporalStart: input.temporalStart ? new Date(input.temporalStart) : null,
        temporalEnd: input.temporalEnd ? new Date(input.temporalEnd) : null,
        presentation: input.presentation ?? {},
      }).returning();
      return result;
    }),

  update: procedure
    .input(updateCollectionSchema.extend({ ownerId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await assertOwnership(input.id, input.ownerId);
      const { id, ownerId, temporalStart, temporalEnd, ...rest } = input;
      const updates: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      };
      if (temporalStart !== undefined) {
        updates.temporalStart = new Date(temporalStart);
      }
      if (temporalEnd !== undefined) {
        updates.temporalEnd = new Date(temporalEnd);
      }
      const [result] = await db.update(collection)
        .set(updates)
        .where(eq(collection.id, id))
        .returning();
      return result;
    }),

  delete: procedure
    .input(z.object({ id: z.string().uuid(), ownerId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await assertOwnership(input.id, input.ownerId);
      await db.delete(collection).where(eq(collection.id, input.id));
      await invalidateCollectionCache(input.id);
      return { success: true };
    }),
});
