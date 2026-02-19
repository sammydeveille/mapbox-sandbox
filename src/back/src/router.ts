import { config } from 'dotenv';
import { publicProcedure, t } from './trpc.js';
import { feedbackRouter } from './routers/feedback.js';
import { locationRouter } from './routers/location.js';

config();

export const appRouter = t.router({
  feedback: feedbackRouter,
  getMapboxToken: publicProcedure.query(() => ({ token: process.env.MAPBOX_ACCESS_TOKEN! })),
  location: locationRouter,
});

export type AppRouter = typeof appRouter;
