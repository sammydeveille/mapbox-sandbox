import type { DataPointInput } from './types.js';

/**
 * Resolves a dot-separated path on an object.
 * e.g., getByPath({ data: { items: [1,2] } }, "data.items") => [1,2]
 */
function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Transforms an external API response into DataPointInput[] using a configurable field mapping.
 *
 * The fieldMapping maps DataPoint fields to dot-separated paths in the API response items:
 * - `items` → path to the array of items in the response (e.g., "data", "results", "features")
 * - `latitude` → path to latitude field within each item
 * - `longitude` → path to longitude field within each item
 * - `timestamp` → path to timestamp field within each item
 * - `value` → path to numeric value field within each item
 *
 * Invalid items are silently skipped. If the response is not an object or the items path
 * doesn't resolve to an array, an empty array is returned (atomicity on error).
 */
export function transformAPIResponse(
  response: unknown,
  fieldMapping: Record<string, string>
): DataPointInput[] {
  if (response === null || response === undefined || typeof response !== 'object') {
    return [];
  }

  const itemsPath = fieldMapping['items'];
  if (!itemsPath) {
    return [];
  }

  const items = getByPath(response, itemsPath);
  if (!Array.isArray(items)) {
    return [];
  }

  const points: DataPointInput[] = [];

  for (const item of items) {
    if (item === null || item === undefined || typeof item !== 'object') {
      continue;
    }

    // Extract latitude
    const latRaw = getByPath(item, fieldMapping['latitude'] ?? '');
    const lat = Number(latRaw);
    if (!isFinite(lat) || lat < -90 || lat > 90) {
      continue;
    }

    // Extract longitude
    const lngRaw = getByPath(item, fieldMapping['longitude'] ?? '');
    const lng = Number(lngRaw);
    if (!isFinite(lng) || lng < -180 || lng > 180) {
      continue;
    }

    // Extract timestamp
    const tsRaw = getByPath(item, fieldMapping['timestamp'] ?? '');
    if (tsRaw === null || tsRaw === undefined) {
      continue;
    }
    const tsDate = new Date(tsRaw as string | number);
    if (isNaN(tsDate.getTime())) {
      continue;
    }

    // Extract value
    const valRaw = getByPath(item, fieldMapping['value'] ?? '');
    const value = Number(valRaw);
    if (!isFinite(value)) {
      continue;
    }

    points.push({
      geometry: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      timestamp: tsDate.toISOString(),
      temporalPrecision: 'instant',
      value,
    });
  }

  return points;
}

/**
 * Fetches data from an external API URL and transforms the response into DataPointInput[].
 * On any error (network, parse, etc.), returns an empty array to ensure atomicity —
 * no partial data points are produced on failure.
 */
export async function fetchAndTransform(
  url: string,
  fieldMapping: Record<string, string>
): Promise<DataPointInput[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return [];
    }
    const body: unknown = await res.json();
    return transformAPIResponse(body, fieldMapping);
  } catch {
    return [];
  }
}
