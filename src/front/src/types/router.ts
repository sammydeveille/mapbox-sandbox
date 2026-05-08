import type { RouterOutputs } from '@/lib/trpc';

export type Feedback = RouterOutputs['feedback']['list'][0];
export type LocationInfo = RouterOutputs['location']['getInfo'];
