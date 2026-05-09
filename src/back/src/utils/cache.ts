import { createHash } from 'crypto';
import { redis } from './redis.js';
import type { SpatialTemporalQuery } from '../types/spatiotemporal.js';

const CACHE_TTL = 300; // seconds
const COLLECTION_PREFIX = 'stc:';

/**
 * Builds a deterministic cache key from a spatial-temporal query.
 * Keys are normalized by sorting object properties before hashing,
 * ensuring identical queries produce the same key regardless of property order.
 */
export function buildCacheKey(query: SpatialTemporalQuery): string {
  const normalized = JSON.stringify(query, Object.keys(query).sort());
  const hash = createHash('sha256').update(normalized).digest('hex');
  return `${COLLECTION_PREFIX}query:${hash}`;
}

/**
 * Retrieves a cached value by key, returning null if not found.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  return data ? (JSON.parse(data) as T) : null;
}

/**
 * Stores a value in the cache with the configured TTL (300 seconds).
 */
export async function setCache(key: string, value: unknown): Promise<void> {
  await redis.setEx(key, CACHE_TTL, JSON.stringify(value));
}

/**
 * Invalidates all cached queries by scanning for keys matching the
 * collection prefix pattern and deleting them in batches.
 */
export async function invalidateCollectionCache(collectionId: string): Promise<void> {
  const pattern = `${COLLECTION_PREFIX}query:*`;
  let cursor = '0';

  do {
    const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
    cursor = result.cursor;

    if (result.keys.length > 0) {
      await redis.del(result.keys);
    }
  } while (cursor !== '0');
}
