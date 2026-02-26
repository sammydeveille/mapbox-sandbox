import { z } from 'zod';
import { db } from '../db/index';
import { feedback } from '../db/schema';
import { eq } from 'drizzle-orm';
import { procedure, t } from '../trpc';
import { log } from '../utils/log';
import { noHtmlString } from '../utils/validators';
import type { Feedback, FeedbackNew } from '../types/feedback';

export const feedbackRouter = t.router({
  list: procedure.query(async (): Promise<Feedback[]> => {
    log.debug('[DB] Fetching all feedback');
    return await db.select().from(feedback);
  }),

  create: procedure
    .input(z.object({ 
      title: noHtmlString({ max: 255 }),
      description: noHtmlString({ max: 5000 })
    }))
    .mutation(async ({ input }): Promise<Feedback> => {
      log.debug('[DB] Creating feedback:', input.title);
      const [result] = await db.insert(feedback).values(input as FeedbackNew).returning();
      return result;
    }),

  update: procedure
    .input(z.object({ 
      id: z.number().int().positive(),
      title: noHtmlString({ max: 255 }),
      description: noHtmlString({ max: 5000 })
    }))
    .mutation(async ({ input }): Promise<Feedback> => {
      log.debug('[DB] Updating feedback:', input.id);
      const [result] = await db.update(feedback)
        .set({ title: input.title, description: input.description })
        .where(eq(feedback.id, input.id))
        .returning();
      return result;
    }),

  delete: procedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      log.debug('[DB] Deleting feedback:', input.id);
      await db.delete(feedback).where(eq(feedback.id, input.id));
      return { success: true };
    }),

  assignLabel: procedure
    .input(z.object({
      feedbackId: z.number().int().positive(),
      labelId: z.number().int().positive()
    }))
    .mutation(async ({ input }) => {
      log.debug('[DB] Assigning label to feedback:', input.feedbackId, input.labelId);
      // Implementation for assigning label to feedback

      

    })
});
