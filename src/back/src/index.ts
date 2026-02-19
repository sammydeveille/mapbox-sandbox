import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router.js';
import { config } from 'dotenv';
import { log } from './utils/log.js';

config();

const app = express();
const port = Number(process.env.PORT) || 3001;
const host = '0.0.0.0';

app.use(cors());
app.use(express.json());

app.use('/trpc', createExpressMiddleware({ router: appRouter }));

app.use('/trpc', (req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    log.debug(`[HTTP] ${res.statusCode} ${req.method} ${req.path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`);
    return originalSend.call(this, data);
  };
  next();
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log.error('[Express Error]:', err);
  const status = err.status || 500;
  log.debug(`[HTTP] ${status} ${req.method} ${req.path}`);
  res.status(status).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
});

app.listen(port, host, () => {
  console.log(`Server running on http://localhost:${port}`);
});
