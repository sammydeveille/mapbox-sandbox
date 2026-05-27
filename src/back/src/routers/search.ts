import { createHash } from 'crypto';
import { procedure, t } from '../trpc.js';
import { searchQuerySchema } from '../types/knowledge.js';
import { db } from '../db/index.js';
import { buildSearchQuery } from '../utils/search.js';
import { redis } from '../utils/redis.js';
import { sql } from 'drizzle-orm';

const SEARCH_CACHE_TTL = 60; // seconds
const SEARCH_CACHE_PREFIX = 'search:';

/**
 * Builds a deterministic cache key from search query parameters.
 */
function buildSearchCacheKey(params: Record<string, unknown>): string {
  const normalized = JSON.stringify(params, Object.keys(params).sort());
  const hash = createHash('sha256').update(normalized).digest('hex');
  return `${SEARCH_CACHE_PREFIX}${hash}`;
}

export const searchRouter = t.router({
  query: procedure
    .input(searchQuerySchema)
    .query(async ({ input }) => {
      const page = input.page ?? 0;
      const pageSize = input.pageSize ?? 20;

      // Check cache
      const cacheKey = buildSearchCacheKey(input as Record<string, unknown>);
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as {
          results: Array<{
            id: string;
            title: string;
            summary: string;
            itemType: string;
            content: string | null;
            score: number;
            createdAt: string;
            updatedAt: string;
            times: Array<{ id: string; startTime: string; endTime: string | null; precision: string }>;
            places: Array<{ id: string; geometry: unknown; placeName: string | null; precision: string }>;
          }>;
          total: number;
          page: number;
          pageSize: number;
        };
      }

      const { dataQuery, countQuery } = buildSearchQuery({
        text: input.text,
        bbox: input.bbox,
        timeStart: input.timeStart,
        timeEnd: input.timeEnd,
        itemTypes: input.itemTypes,
        page,
        pageSize,
      });

      // Execute both queries
      const [dataResult, countResult] = await Promise.all([
        db.execute(dataQuery),
        db.execute(countQuery),
      ]);

      const total = Number((countResult.rows[0] as { total: string })?.total ?? 0);
      const items = dataResult.rows as Array<{
        id: string;
        title: string;
        summary: string;
        item_type: string;
        content: string | null;
        score: number;
        created_at: string;
        updated_at: string;
      }>;

      // Fetch associated times and places for each result item
      const results = await Promise.all(
        items.map(async (item) => {
          const [timesResult, placesResult] = await Promise.all([
            db.execute(sql`
              SELECT id, start_time, end_time, precision
              FROM item_time
              WHERE knowledge_item_id = ${item.id}
            `),
            db.execute(sql`
              SELECT id, ST_AsGeoJSON(geometry)::json as geometry, place_name, precision
              FROM item_place
              WHERE knowledge_item_id = ${item.id}
            `),
          ]);

          return {
            id: item.id,
            title: item.title,
            summary: item.summary,
            itemType: item.item_type,
            content: item.content,
            score: Number(item.score),
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            times: timesResult.rows as Array<{
              id: string;
              start_time: string;
              end_time: string | null;
              precision: string;
            }>,
            places: placesResult.rows as Array<{
              id: string;
              geometry: unknown;
              place_name: string | null;
              precision: string;
            }>,
          };
        })
      );

      const response = { results, total, page, pageSize };

      // Cache the response
      await redis.setEx(cacheKey, SEARCH_CACHE_TTL, JSON.stringify(response));

      return response;
    }),
});
