import { createTRPCContext } from '@trpc/tanstack-react-query';
import type { AppRouter } from '../../../back/src/router';
import type { inferRouterOutputs } from '@trpc/server';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();
export type RouterOutputs = inferRouterOutputs<AppRouter>;
