import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { feedback } from '../db/schema';

export type Feedback = InferSelectModel<typeof feedback>;
export type FeedbackNew = InferInsertModel<typeof feedback>;