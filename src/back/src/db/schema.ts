import { defineRelations } from 'drizzle-orm';
import { integer, pgTable, primaryKey, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const label = pgTable('label', { 
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const feedbackLabel = pgTable('feedbackLabel', {
  feedbackId: integer('feedback_id').notNull().references(() => feedback.id),
  labelId: integer('label_id').notNull().references(() => label.id)
}, (t) => [primaryKey({ columns: [t.feedbackId, t.labelId ]})]);

// export const relations = defineRelations({ feedback, label, feedbackLabel}, (r) => ({
//     feedback: {
//       labels: r.many.groups({
//         from: r.feedback.id.through(r.feedbackLabel.feedbackId),
//         to: r.groups.id.through(r.feedbackLabel.labelId),
//       }),
//     },
//     label: {
//       feedbacks: r.many.feedback(),
//     },
//   }))