import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router.js';
import { config } from 'dotenv';
import { log } from './utils/log.js';

config();

const app = express();
const PORT = Number(process.env.PORT_BACK);
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use('/trpc', createExpressMiddleware({ router: appRouter }));

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log.error('[Express Error]:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
});

app.listen(PORT, HOST, () => {
  log.info(`Server running on http://localhost:${PORT}`);
});
