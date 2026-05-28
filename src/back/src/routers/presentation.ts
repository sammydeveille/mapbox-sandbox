import { z } from 'zod';
import { procedure, t } from '../trpc.js';
import {
  createPresentationSchema,
  createPresentationSlideSchema,
  createSlideItemSchema,
  viewStateSchema,
} from '../types/knowledge.js';
import { db } from '../db/index.js';
import {
  presentation,
  presentationSlide,
  slideItem,
  collection,
  knowledgeItem,
} from '../db/schema.js';
import { eq, and, sql, gte, gt, lt, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const presentationRouter = t.router({
  // ─── Presentation CRUD ────────────────────────────────────────────────────

  create: procedure
    .input(createPresentationSchema)
    .mutation(async ({ input }) => {
      // If collectionId is provided, validate it exists
      if (input.collectionId) {
        const [col] = await db
          .select()
          .from(collection)
          .where(eq(collection.id, input.collectionId));

        if (!col) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Collection not found',
          });
        }
      }

      const [created] = await db.insert(presentation).values({
        collectionId: input.collectionId ?? null,
        ownerId: input.ownerId,
        title: input.title,
        description: input.description,
      }).returning();

      return created;
    }),

  list: procedure
    .input(z.object({
      collectionId: z.string().uuid().optional(),
      ownerId: z.string().uuid().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.collectionId) {
        conditions.push(eq(presentation.collectionId, input.collectionId));
      }
      if (input.ownerId) {
        conditions.push(eq(presentation.ownerId, input.ownerId));
      }

      return db
        .select()
        .from(presentation)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(presentation.createdAt));
    }),

  get: procedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [pres] = await db
        .select()
        .from(presentation)
        .where(eq(presentation.id, input.id));

      if (!pres) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Presentation not found',
        });
      }

      // Get all slides ordered by position
      const slides = await db
        .select()
        .from(presentationSlide)
        .where(eq(presentationSlide.presentationId, input.id))
        .orderBy(asc(presentationSlide.position));

      // Get items for each slide
      const slidesWithItems = await Promise.all(
        slides.map(async (slide) => {
          const items = await db
            .select()
            .from(slideItem)
            .where(eq(slideItem.slideId, slide.id))
            .orderBy(asc(slideItem.position));

          return { ...slide, items };
        })
      );

      return { ...pres, slides: slidesWithItems };
    }),

  update: procedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const [existing] = await db
        .select()
        .from(presentation)
        .where(eq(presentation.id, id));

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Presentation not found',
        });
      }

      const [updated] = await db
        .update(presentation)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(presentation.id, id))
        .returning();

      return updated;
    }),

  delete: procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(presentation)
        .where(eq(presentation.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Presentation not found',
        });
      }

      await db.delete(presentation).where(eq(presentation.id, input.id));
      return { success: true };
    }),

  // ─── Slide Management ───────────────────────────────────────────────────────

  addSlide: procedure
    .input(createPresentationSlideSchema)
    .mutation(async ({ input }) => {
      // Validate presentation exists
      const [pres] = await db
        .select()
        .from(presentation)
        .where(eq(presentation.id, input.presentationId));

      if (!pres) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Presentation not found',
        });
      }

      // Shift existing slides at >= position up by 1
      await db
        .update(presentationSlide)
        .set({ position: sql`${presentationSlide.position} + 1` })
        .where(
          and(
            eq(presentationSlide.presentationId, input.presentationId),
            gte(presentationSlide.position, input.position),
          )
        );

      // Insert new slide
      const [created] = await db.insert(presentationSlide).values({
        presentationId: input.presentationId,
        position: input.position,
        title: input.title,
        narratorNote: input.narratorNote,
        viewState: input.viewState,
      }).returning();

      return created;
    }),

  updateSlide: procedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().max(255).optional(),
        narratorNote: z.string().max(2000).optional(),
        viewState: viewStateSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const [existing] = await db
        .select()
        .from(presentationSlide)
        .where(eq(presentationSlide.id, id));

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Slide not found',
        });
      }

      const [updated] = await db
        .update(presentationSlide)
        .set(updateData)
        .where(eq(presentationSlide.id, id))
        .returning();

      return updated;
    }),

  removeSlide: procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(presentationSlide)
        .where(eq(presentationSlide.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Slide not found',
        });
      }

      // Delete the slide
      await db.delete(presentationSlide).where(eq(presentationSlide.id, input.id));

      // Decrement position of all slides with position > deleted position
      await db
        .update(presentationSlide)
        .set({ position: sql`${presentationSlide.position} - 1` })
        .where(
          and(
            eq(presentationSlide.presentationId, existing.presentationId),
            gt(presentationSlide.position, existing.position),
          )
        );

      return { success: true };
    }),

  reorderSlides: procedure
    .input(
      z.object({
        presentationId: z.string().uuid(),
        slideIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ input }) => {
      // Update each slide's position based on its index in the array
      for (let i = 0; i < input.slideIds.length; i++) {
        await db
          .update(presentationSlide)
          .set({ position: i + 1 })
          .where(
            and(
              eq(presentationSlide.id, input.slideIds[i]),
              eq(presentationSlide.presentationId, input.presentationId),
            )
          );
      }

      return { success: true };
    }),

  // ─── Slide Item Management ──────────────────────────────────────────────────

  addSlideItem: procedure
    .input(createSlideItemSchema)
    .mutation(async ({ input }) => {
      // Validate knowledge item exists
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

      // Validate slide exists
      const [slide] = await db
        .select()
        .from(presentationSlide)
        .where(eq(presentationSlide.id, input.slideId));

      if (!slide) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Slide not found',
        });
      }

      const [created] = await db.insert(slideItem).values({
        slideId: input.slideId,
        knowledgeItemId: input.knowledgeItemId,
        position: input.position,
        annotation: input.annotation,
      }).returning();

      return created;
    }),

  removeSlideItem: procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(slideItem)
        .where(eq(slideItem.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Slide item not found',
        });
      }

      await db.delete(slideItem).where(eq(slideItem.id, input.id));
      return { success: true };
    }),

  // ─── Navigation ─────────────────────────────────────────────────────────────

  navigate: procedure
    .input(
      z.object({
        presentationId: z.string().uuid(),
        position: z.number().int(),
      })
    )
    .query(async ({ input }) => {
      // Get total slides count
      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(presentationSlide)
        .where(eq(presentationSlide.presentationId, input.presentationId));

      const totalSlides = totalResult[0]?.count ?? 0;

      if (input.position < 1 || input.position > totalSlides) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Position ${input.position} is out of bounds. Valid range: 1 to ${totalSlides}`,
        });
      }

      // Find the slide at the requested position
      const [slide] = await db
        .select()
        .from(presentationSlide)
        .where(
          and(
            eq(presentationSlide.presentationId, input.presentationId),
            eq(presentationSlide.position, input.position),
          )
        );

      if (!slide) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Slide not found at the specified position',
        });
      }

      // Get slide items with their knowledge items and bindings
      const slideItems = await db
        .select()
        .from(slideItem)
        .where(eq(slideItem.slideId, slide.id))
        .orderBy(asc(slideItem.position));

      // For each slide item, get the knowledge item with its time and place bindings
      const items = await Promise.all(
        slideItems.map(async (si) => {
          const [ki] = await db
            .select()
            .from(knowledgeItem)
            .where(eq(knowledgeItem.id, si.knowledgeItemId));

          // Get time bindings
          const timeResult = await db.execute(sql`
            SELECT id, knowledge_item_id, start_time, end_time, precision, created_at
            FROM item_time
            WHERE knowledge_item_id = ${si.knowledgeItemId}
          `);

          // Get place bindings with geometry as GeoJSON
          const placeResult = await db.execute(sql`
            SELECT id, knowledge_item_id, ST_AsGeoJSON(geometry)::json as geometry, place_name, precision, created_at
            FROM item_place
            WHERE knowledge_item_id = ${si.knowledgeItemId}
          `);

          return {
            ...ki,
            slideItemId: si.id,
            annotation: si.annotation,
            position: si.position,
            times: timeResult.rows,
            places: placeResult.rows,
          };
        })
      );

      return {
        slide: {
          id: slide.id,
          presentationId: slide.presentationId,
          position: slide.position,
          title: slide.title,
          narratorNote: slide.narratorNote,
          viewState: slide.viewState,
          createdAt: slide.createdAt,
        },
        items,
        navigation: {
          current: input.position,
          total: totalSlides,
          hasNext: input.position < totalSlides,
          hasPrevious: input.position > 1,
        },
      };
    }),
});
