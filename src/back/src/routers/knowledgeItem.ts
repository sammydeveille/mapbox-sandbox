import { z } from 'zod';
import { procedure, t } from '../trpc.js';
import {
  createKnowledgeItemSchema,
  createItemEvidenceSchema,
  createItemTimeSchema,
  createItemPlaceSchema,
} from '../types/knowledge.js';
import { db } from '../db/index.js';
import {
  knowledgeItem,
  itemEvidence,
  itemTime,
  itemPlace,
  sourceDocument,
} from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const knowledgeItemRouter = t.router({
  // ─── Core CRUD ──────────────────────────────────────────────────────────────

  create: procedure
    .input(
      createKnowledgeItemSchema.extend({
        times: z.array(z.object({
          startTime: z.union([z.string().datetime(), z.date()]),
          endTime: z.union([z.string().datetime(), z.date()]).optional(),
          precision: z.enum(['year', 'month', 'day', 'hour', 'exact']),
        })).optional(),
        places: z.array(z.object({
          geometry: z.any(),
          placeName: z.string().max(512).optional(),
          precision: z.enum(['exact', 'approximate', 'region']),
        })).optional(),
        evidence: z.array(z.object({
          sourceDocumentId: z.string().uuid(),
          relevance: z.enum(['primary', 'supporting', 'contextual']),
          excerpt: z.string().max(500).optional(),
        })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { times, places, evidence, ...itemData } = input;

      const [created] = await db.insert(knowledgeItem).values({
        title: itemData.title,
        summary: itemData.summary,
        itemType: itemData.itemType,
        content: itemData.content,
      }).returning();

      // Insert related time records
      if (times && times.length > 0) {
        await db.insert(itemTime).values(
          times.map((t) => ({
            knowledgeItemId: created.id,
            startTime: new Date(t.startTime instanceof Date ? t.startTime.toISOString() : t.startTime),
            endTime: t.endTime ? new Date(t.endTime instanceof Date ? t.endTime.toISOString() : t.endTime) : undefined,
            precision: t.precision,
          }))
        );
      }

      // Insert related place records using raw SQL for geometry
      if (places && places.length > 0) {
        for (const place of places) {
          await db.execute(sql`
            INSERT INTO item_place (knowledge_item_id, geometry, place_name, precision)
            VALUES (
              ${created.id},
              ST_GeomFromGeoJSON(${JSON.stringify(place.geometry)}),
              ${place.placeName ?? null},
              ${place.precision}
            )
          `);
        }
      }

      // Insert related evidence records
      if (evidence && evidence.length > 0) {
        await db.insert(itemEvidence).values(
          evidence.map((e) => ({
            knowledgeItemId: created.id,
            sourceDocumentId: e.sourceDocumentId,
            relevance: e.relevance,
            excerpt: e.excerpt,
          }))
        );
      }

      return created;
    }),

  get: procedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [item] = await db
        .select()
        .from(knowledgeItem)
        .where(eq(knowledgeItem.id, input.id));

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Knowledge item not found',
        });
      }

      // Fetch evidence with source document info
      const evidenceRows = await db
        .select({
          id: itemEvidence.id,
          knowledgeItemId: itemEvidence.knowledgeItemId,
          sourceDocumentId: itemEvidence.sourceDocumentId,
          relevance: itemEvidence.relevance,
          excerpt: itemEvidence.excerpt,
          createdAt: itemEvidence.createdAt,
          sourceDocument: {
            id: sourceDocument.id,
            sourceId: sourceDocument.sourceId,
            externalId: sourceDocument.externalId,
            contentHash: sourceDocument.contentHash,
            retrievedAt: sourceDocument.retrievedAt,
          },
        })
        .from(itemEvidence)
        .leftJoin(sourceDocument, eq(itemEvidence.sourceDocumentId, sourceDocument.id))
        .where(eq(itemEvidence.knowledgeItemId, input.id));

      // Fetch times
      const times = await db
        .select()
        .from(itemTime)
        .where(eq(itemTime.knowledgeItemId, input.id));

      // Fetch places with geometry as GeoJSON
      const placesResult = await db.execute(sql`
        SELECT id, knowledge_item_id, ST_AsGeoJSON(geometry)::json as geometry, place_name, precision, created_at
        FROM item_place
        WHERE knowledge_item_id = ${input.id}
      `);

      return {
        ...item,
        evidence: evidenceRows,
        times,
        places: placesResult.rows,
      };
    }),

  update: procedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(255).optional(),
        summary: z.string().min(1).max(2000).optional(),
        itemType: z.enum(['article', 'event', 'statistic', 'concept', 'place']).optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const [existing] = await db
        .select()
        .from(knowledgeItem)
        .where(eq(knowledgeItem.id, id));

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Knowledge item not found',
        });
      }

      const [updated] = await db
        .update(knowledgeItem)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(knowledgeItem.id, id))
        .returning();

      return updated;
    }),

  delete: procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(knowledgeItem)
        .where(eq(knowledgeItem.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Knowledge item not found',
        });
      }

      await db.delete(knowledgeItem).where(eq(knowledgeItem.id, input.id));
      return { success: true };
    }),

  // ─── Evidence Management ────────────────────────────────────────────────────

  addEvidence: procedure
    .input(createItemEvidenceSchema)
    .mutation(async ({ input }) => {
      // Validate knowledgeItemId exists
      const [item] = await db
        .select()
        .from(knowledgeItem)
        .where(eq(knowledgeItem.id, input.knowledgeItemId));

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Knowledge item not found',
        });
      }

      // Validate sourceDocumentId exists
      const [doc] = await db
        .select()
        .from(sourceDocument)
        .where(eq(sourceDocument.id, input.sourceDocumentId));

      if (!doc) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Source document not found',
        });
      }

      const [created] = await db.insert(itemEvidence).values({
        knowledgeItemId: input.knowledgeItemId,
        sourceDocumentId: input.sourceDocumentId,
        relevance: input.relevance,
        excerpt: input.excerpt,
      }).returning();

      return created;
    }),

  removeEvidence: procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(itemEvidence).where(eq(itemEvidence.id, input.id));
      return { success: true };
    }),

  // ─── Temporal Binding ───────────────────────────────────────────────────────

  addTime: procedure
    .input(createItemTimeSchema)
    .mutation(async ({ input }) => {
      const [created] = await db.insert(itemTime).values({
        knowledgeItemId: input.knowledgeItemId,
        startTime: new Date(input.startTime instanceof Date ? input.startTime.toISOString() : input.startTime),
        endTime: input.endTime ? new Date(input.endTime instanceof Date ? input.endTime.toISOString() : input.endTime) : undefined,
        precision: input.precision,
      }).returning();

      return created;
    }),

  removeTime: procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(itemTime).where(eq(itemTime.id, input.id));
      return { success: true };
    }),

  // ─── Spatial Binding ────────────────────────────────────────────────────────

  addPlace: procedure
    .input(createItemPlaceSchema)
    .mutation(async ({ input }) => {
      const result = await db.execute(sql`
        INSERT INTO item_place (knowledge_item_id, geometry, place_name, precision)
        VALUES (
          ${input.knowledgeItemId},
          ST_GeomFromGeoJSON(${JSON.stringify(input.geometry)}),
          ${input.placeName ?? null},
          ${input.precision}
        )
        RETURNING id, knowledge_item_id, ST_AsGeoJSON(geometry)::json as geometry, place_name, precision, created_at
      `);

      return result.rows[0];
    }),

  removePlace: procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(itemPlace).where(eq(itemPlace.id, input.id));
      return { success: true };
    }),
});
