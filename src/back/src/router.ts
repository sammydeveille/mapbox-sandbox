import { config } from 'dotenv';
import { procedure, t } from './trpc';
import { feedbackRouter } from './routers/feedback';
import { locationRouter } from './routers/location';

config();

export const appRouter = t.router({
  feedback: feedbackRouter,
  getMapboxToken: procedure.query(() => {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (!token) throw new Error('MAPBOX_ACCESS_TOKEN not configured');
    return { token };
  }),
  health: procedure.query(() => ({ status: 'ok', timestamp: new Date().toISOString() })),
  location: locationRouter,
});

export type AppRouter = typeof appRouter;
