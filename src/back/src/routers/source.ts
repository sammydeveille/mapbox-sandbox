import { z } from 'zod';
import { createHash } from 'crypto';
import { procedure, t } from '../trpc.js';
import { createSourceSchema, createSourceDocumentSchema } from '../types/knowledge.js';
import { db } from '../db/index.js';
import { source, sourceDocument } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const sourceRouter = t.router({
  create: procedure
    .input(createSourceSchema)
    .mutation(async ({ input }) => {
      try {
        const [result] = await db.insert(source).values({
          name: input.name,
          baseUrl: input.baseUrl,
          sourceType: input.sourceType,
        }).returning();
        return result;
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          error.message.includes('unique') ||
          (error instanceof Error && error.message.includes('duplicate'))
        ) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Source name "${input.name}" already exists`,
          });
        }
        throw error;
      }
    }),

  list: procedure
    .query(async () => {
      return db.select().from(source).orderBy(desc(source.createdAt));
    }),

  get: procedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [found] = await db
        .select()
        .from(source)
        .where(eq(source.id, input.id));

      if (!found) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Source not found',
        });
      }

      return found;
    }),

  delete: procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [found] = await db
        .select()
        .from(source)
        .where(eq(source.id, input.id));

      if (!found) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Source not found',
        });
      }

      await db.delete(source).where(eq(source.id, input.id));
      return { success: true };
    }),

  upsertDocument: procedure
    .input(createSourceDocumentSchema)
    .mutation(async ({ input }) => {
      const contentHash = createHash('sha256')
        .update(JSON.stringify(input.rawContent))
        .digest('hex');

      // Check if a document with the same contentHash AND sourceId already exists
      const [existing] = await db
        .select()
        .from(sourceDocument)
        .where(
          and(
            eq(sourceDocument.contentHash, contentHash),
            eq(sourceDocument.sourceId, input.sourceId),
          )
        );

      if (existing) {
        // Update only retrievedAt timestamp
        const [updated] = await db
          .update(sourceDocument)
          .set({ retrievedAt: new Date() })
          .where(eq(sourceDocument.id, existing.id))
          .returning();
        return updated;
      }

      // Insert new source_document record
      try {
        const [created] = await db.insert(sourceDocument).values({
          sourceId: input.sourceId,
          externalId: input.externalId,
          rawContent: input.rawContent,
          contentHash,
        }).returning();
        return created;
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          (error.message.includes('foreign key') || error.message.includes('violates foreign key'))
        ) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Referenced source not found',
          });
        }
        throw error;
      }
    }),
});
