import { config } from 'dotenv';
import { procedure, t } from './trpc';
import { feedbackRouter } from './routers/feedback';
import { locationRouter } from './routers/location';

config();

export const appRouter = t.router({
  feedback: feedbackRouter,
  getMapboxToken: procedure.query(() => ({ token: process.env.MAPBOX_ACCESS_TOKEN! })),
  location: locationRouter,
});

export type AppRouter = typeof appRouter;
