/**
 * Search parameter construction utilities for the Knowledge Search Panel.
 *
 * Builds tRPC query inputs from active filters and determines
 * whether the search action should be disabled.
 */

export interface SearchFilters {
  text: string;
  spatialEnabled: boolean;
  bbox: [number, number, number, number] | null; // [west, south, east, north]
  timeStart: string | null; // ISO 8601
  timeEnd: string | null; // ISO 8601
  page: number;
}

export interface SearchParams {
  text?: string;
  bbox?: [number, number, number, number];
  timeStart?: string;
  timeEnd?: string;
  page?: number;
}

/**
 * Constructs the tRPC `search.query` input from active filters.
 *
 * - Includes `text` if non-empty
 * - Includes `bbox` if spatialEnabled is true and bbox is non-null
 * - Includes `timeStart` if non-null
 * - Includes `timeEnd` if non-null
 * - Always includes `page`
 */
export function buildSearchParams(filters: SearchFilters): SearchParams {
  const params: SearchParams = {};

  if (filters.text.trim().length > 0) {
    params.text = filters.text;
  }

  if (filters.spatialEnabled && filters.bbox !== null) {
    params.bbox = filters.bbox;
  }

  if (filters.timeStart !== null) {
    params.timeStart = filters.timeStart;
  }

  if (filters.timeEnd !== null) {
    params.timeEnd = filters.timeEnd;
  }

  params.page = filters.page;

  return params;
}

/**
 * Returns true when no filters are active, meaning the search action should be disabled.
 *
 * Search is disabled when:
 * - text is empty AND
 * - spatialEnabled is false AND
 * - timeStart is null AND
 * - timeEnd is null
 */
export function isSearchDisabled(filters: SearchFilters): boolean {
  const hasText = filters.text.trim().length > 0;
  const hasSpatial = filters.spatialEnabled;
  const hasTimeStart = filters.timeStart !== null;
  const hasTimeEnd = filters.timeEnd !== null;

  return !hasText && !hasSpatial && !hasTimeStart && !hasTimeEnd;
}
