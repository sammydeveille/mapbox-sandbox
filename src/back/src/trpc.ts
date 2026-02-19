import { initTRPC, TRPCError } from '@trpc/server';
import { log } from './utils/log.js';

export const t = initTRPC.create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause.message : null,
      },
    };
  },
});

const loggerMiddleware = t.middleware(async ({ path, type, input, next }) => {
  const hasInput = input !== undefined && Object.keys(input || {}).length > 0;
  log.info(`[tRPC] ${type} ${path}`, hasInput ? input : '');
  return next();
});

const errorHandlerMiddleware = t.middleware(async ({ path, type, next }) => {
  try {
    const result = await next();
    log.debug(`[HTTP:200] ${type} ${path}`);
    return result;
  } catch (error) {
    log.error(`[tRPC Error] ${type} ${path}:`, error);
    
    if (error instanceof TRPCError) {
      log.debug(`[HTTP:ERROR] ${type} ${path} - ${error.code}`);
      throw error;
    }
    
    log.debug(`[HTTP] 500 ${type} ${path}`);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      cause: error,
    });
  }
});

export const publicProcedure = t.procedure.use(loggerMiddleware).use(errorHandlerMiddleware);
