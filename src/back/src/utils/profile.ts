import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userProfile } from '../db/schema.js';

/**
 * Ensures a user_profile record exists for the given anonymous ID.
 * If no profile exists, creates one with default empty preferences.
 * Returns the profile record.
 */
export async function ensureProfile(id: string) {
  const [existing] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.id, id));

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(userProfile)
    .values({ id, preferences: {} })
    .returning();

  return created;
}
