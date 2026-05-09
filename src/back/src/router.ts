import { config } from 'dotenv';
import { procedure, t } from './trpc.js';
import { locationRouter } from './routers/location.js';
import { collectionRouter } from './routers/collection.js';
import { dataLayerRouter } from './routers/dataLayer.js';
import { dataPointRouter } from './routers/dataPoint.js';
import { importRouter } from './routers/import.js';

config();

export const appRouter = t.router({
  collection: collectionRouter,
  dataLayer: dataLayerRouter,
  dataPoint: dataPointRouter,
  getMapboxToken: procedure.query(() => {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (!token) throw new Error('MAPBOX_ACCESS_TOKEN not configured');
    return { token };
  }),
  health: procedure.query(() => ({ status: 'ok', timestamp: new Date().toISOString() })),
  import: importRouter,
  location: locationRouter,
});

export type AppRouter = typeof appRouter;
