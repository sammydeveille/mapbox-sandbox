import { sql } from 'drizzle-orm';

export interface SearchQueryParams {
  text?: string;
  bbox?: [number, number, number, number];
  timeStart?: string;
  timeEnd?: string;
  itemTypes?: string[];
  page?: number;
  pageSize?: number;
}

export interface BuiltSearchQueries {
  dataQuery: ReturnType<typeof sql>;
  countQuery: ReturnType<typeof sql>;
}

/**
 * Builds dynamic SQL queries for unified search across knowledge items.
 * Combines full-text search, spatial filtering, temporal filtering, and item type filtering.
 * Returns both a data query (with pagination) and a count query (for total results).
 */
export function buildSearchQuery(params: SearchQueryParams): BuiltSearchQueries {
  const {
    text,
    bbox,
    timeStart,
    timeEnd,
    itemTypes,
    page = 0,
    pageSize = 20,
  } = params;

  const conditions: ReturnType<typeof sql>[] = [];

  // Full-text search condition
  if (text) {
    conditions.push(
      sql`to_tsvector('english', knowledge_item.title || ' ' || knowledge_item.summary || ' ' || COALESCE(knowledge_item.content, '')) @@ plainto_tsquery('english', ${text})`
    );
  }

  // Spatial filter condition
  if (bbox) {
    const [west, south, east, north] = bbox;
    conditions.push(
      sql`ST_Intersects(item_place.geometry, ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326))`
    );
  }

  // Temporal filter condition
  if (timeStart && timeEnd) {
    conditions.push(
      sql`item_time.start_time <= ${timeEnd}::timestamptz AND COALESCE(item_time.end_time, item_time.start_time) >= ${timeStart}::timestamptz`
    );
  } else if (timeStart) {
    conditions.push(
      sql`COALESCE(item_time.end_time, item_time.start_time) >= ${timeStart}::timestamptz`
    );
  } else if (timeEnd) {
    conditions.push(
      sql`item_time.start_time <= ${timeEnd}::timestamptz`
    );
  }

  // Item type filter condition
  if (itemTypes && itemTypes.length > 0) {
    const typeList = itemTypes.map((t) => sql`${t}`);
    conditions.push(
      sql`knowledge_item.item_type IN (${sql.join(typeList, sql`, `)})`
    );
  }

  // Build WHERE clause
  const whereClause = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  // Build ORDER BY clause
  const orderByClause = text
    ? sql`ORDER BY ts_rank(to_tsvector('english', knowledge_item.title || ' ' || knowledge_item.summary || ' ' || COALESCE(knowledge_item.content, '')), plainto_tsquery('english', ${text})) DESC`
    : sql`ORDER BY knowledge_item.created_at DESC`;

  // Score select expression
  const scoreSelect = text
    ? sql`ts_rank(to_tsvector('english', knowledge_item.title || ' ' || knowledge_item.summary || ' ' || COALESCE(knowledge_item.content, '')), plainto_tsquery('english', ${text})) as score`
    : sql`1.0 as score`;

  // Build FROM clause with LEFT JOINs
  const fromClause = sql`FROM knowledge_item
    LEFT JOIN item_time ON item_time.knowledge_item_id = knowledge_item.id
    LEFT JOIN item_place ON item_place.knowledge_item_id = knowledge_item.id`;

  // Data query with DISTINCT ON to avoid duplicates from joins
  const offset = page * pageSize;
  const dataQuery = sql`
    SELECT DISTINCT ON (knowledge_item.id)
      knowledge_item.id,
      knowledge_item.title,
      knowledge_item.summary,
      knowledge_item.item_type,
      knowledge_item.content,
      knowledge_item.created_at,
      knowledge_item.updated_at,
      ${scoreSelect}
    ${fromClause}
    ${whereClause}
    ORDER BY knowledge_item.id, ${text
      ? sql`ts_rank(to_tsvector('english', knowledge_item.title || ' ' || knowledge_item.summary || ' ' || COALESCE(knowledge_item.content, '')), plainto_tsquery('english', ${text})) DESC`
      : sql`knowledge_item.created_at DESC`
    }
  `;

  // Wrap in a subquery to apply the desired ordering and pagination
  const paginatedDataQuery = sql`
    SELECT * FROM (${dataQuery}) AS ranked
    ORDER BY ${text ? sql`score DESC` : sql`created_at DESC`}
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  // Count query
  const countQuery = sql`
    SELECT COUNT(DISTINCT knowledge_item.id) as total
    ${fromClause}
    ${whereClause}
  `;

  return { dataQuery: paginatedDataQuery, countQuery };
}
