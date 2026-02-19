import { z } from 'zod';
import { db } from '../db/index.js';
import { feedback } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { publicProcedure, t } from '../trpc.js';
import { log } from '../utils/log.js';
import { noHtmlString } from '../utils/validators.js';

export const feedbackRouter = t.router({
  list: publicProcedure.query(async () => {
    log.debug('[DB] Fetching all feedback');
    return await db.select().from(feedback);
  }),

  create: publicProcedure
    .input(z.object({ 
      title: noHtmlString({ max: 255 }),
      description: noHtmlString({ max: 5000 })
    }))
    .mutation(async ({ input }) => {
      log.debug('[DB] Creating feedback:', input.title);
      const [result] = await db.insert(feedback).values(input).returning();
      return result;
    }),

  update: publicProcedure
    .input(z.object({ 
      id: z.number().int().positive(),
      title: noHtmlString({ max: 255 }),
      description: noHtmlString({ max: 5000 })
    }))
    .mutation(async ({ input }) => {
      log.debug('[DB] Updating feedback:', input.id);
      const [result] = await db.update(feedback)
        .set({ title: input.title, description: input.description })
        .where(eq(feedback.id, input.id))
        .returning();
      return result;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      log.debug('[DB] Deleting feedback:', input.id);
      await db.delete(feedback).where(eq(feedback.id, input.id));
      return { success: true };
    }),
});
