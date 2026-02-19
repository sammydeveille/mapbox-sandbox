import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../back/src/router';

export const trpc = createTRPCReact<AppRouter>();
