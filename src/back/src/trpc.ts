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

function getStatusCode(code: string): number {
  const statusMap: Record<string, number> = {
    'BAD_REQUEST': 400,
    'UNAUTHORIZED': 401,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'METHOD_NOT_SUPPORTED': 405,
    'TIMEOUT': 408,
    'CONFLICT': 409,
    'PRECONDITION_FAILED': 412,
    'PAYLOAD_TOO_LARGE': 413,
    'UNPROCESSABLE_CONTENT': 422,
    'TOO_MANY_REQUESTS': 429,
    'CLIENT_CLOSED_REQUEST': 499,
    'INTERNAL_SERVER_ERROR': 500,
  };
  return statusMap[code] || 500;
}

const loggingMdw = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  
  try {
    const result = await next();
    const duration = Date.now() - start;
    log.info(`200 ${type.toUpperCase()} ${path} ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    if (error instanceof TRPCError) {
      const statusCode = getStatusCode(error.code);
      log.info(`${statusCode} ${type.toUpperCase()} ${path} ${duration}ms`);
      throw error;
    }
    
    log.info(`500 ${type.toUpperCase()} ${path} ${duration}ms`);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      cause: error,
    });
  }
});



export const publicProcedure = t.procedure.use(loggingMdw);
