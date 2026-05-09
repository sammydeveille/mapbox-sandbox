import type { TemporalPrecision } from '../types/spatiotemporal.js';
import type { DataPointInput } from './types.js';

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: unknown;
  } | null;
  properties: Record<string, unknown> | null;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/**
 * Parses a GeoJSON string (FeatureCollection) and returns valid data points
 * along with any errors encountered during parsing.
 *
 * - Validates that the input is a valid GeoJSON FeatureCollection
 * - Extracts geometry from each Feature
 * - Uses timestampField to extract timestamp from properties, or falls back to defaultTimestamp
 * - Skips features with invalid geometry or missing timestamps
 */
export function parseGeoJSON(
  content: string,
  timestampField?: string,
  defaultTimestamp?: string,
  temporalPrecision?: TemporalPrecision
): { points: DataPointInput[]; errors: Array<{ index: number; reason: string }> } {
  const points: DataPointInput[] = [];
  const errors: Array<{ index: number; reason: string }> = [];
  const precision: TemporalPrecision = temporalPrecision ?? 'instant';

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    errors.push({ index: 0, reason: 'Invalid JSON' });
    return { points, errors };
  }

  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    (parsed as Record<string, unknown>).type !== 'FeatureCollection'
  ) {
    errors.push({ index: 0, reason: 'Input is not a GeoJSON FeatureCollection' });
    return { points, errors };
  }

  const fc = parsed as GeoJSONFeatureCollection;

  if (!Array.isArray(fc.features)) {
    errors.push({ index: 0, reason: 'FeatureCollection has no features array' });
    return { points, errors };
  }

  for (let i = 0; i < fc.features.length; i++) {
    const feature = fc.features[i];

    // Validate feature structure
    if (!feature || feature.type !== 'Feature') {
      errors.push({ index: i, reason: 'Invalid Feature object' });
      continue;
    }

    // Validate geometry
    if (!feature.geometry || !feature.geometry.type || !feature.geometry.coordinates) {
      errors.push({ index: i, reason: 'Feature has no valid geometry' });
      continue;
    }

    const geom = feature.geometry;

    // Only accept Point geometries for import (as DataPointInput expects Point)
    if (geom.type !== 'Point') {
      errors.push({ index: i, reason: `Unsupported geometry type: ${geom.type}` });
      continue;
    }

    const coords = geom.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      errors.push({ index: i, reason: 'Invalid Point coordinates' });
      continue;
    }

    const lng = Number(coords[0]);
    const lat = Number(coords[1]);

    if (!isFinite(lng) || lng < -180 || lng > 180) {
      errors.push({ index: i, reason: `Longitude out of range [-180, 180]: ${lng}` });
      continue;
    }

    if (!isFinite(lat) || lat < -90 || lat > 90) {
      errors.push({ index: i, reason: `Latitude out of range [-90, 90]: ${lat}` });
      continue;
    }

    // Extract timestamp
    let timestamp: string | undefined;
    const props = feature.properties ?? {};

    if (timestampField && props[timestampField] !== undefined && props[timestampField] !== null) {
      const tsValue = props[timestampField];
      const tsDate = new Date(tsValue as string | number);
      if (isNaN(tsDate.getTime())) {
        errors.push({ index: i, reason: `Invalid timestamp in field "${timestampField}": ${String(tsValue)}` });
        continue;
      }
      timestamp = tsDate.toISOString();
    } else if (defaultTimestamp) {
      const tsDate = new Date(defaultTimestamp);
      if (isNaN(tsDate.getTime())) {
        errors.push({ index: i, reason: `Invalid default timestamp: ${defaultTimestamp}` });
        continue;
      }
      timestamp = tsDate.toISOString();
    } else {
      errors.push({ index: i, reason: 'No timestamp available (no timestampField match and no defaultTimestamp)' });
      continue;
    }

    // Extract value (default to 0 if not present in properties)
    const valueRaw = props['value'] ?? props['val'] ?? 0;
    const value = Number(valueRaw);
    if (!isFinite(value)) {
      errors.push({ index: i, reason: `Invalid value: ${String(valueRaw)}` });
      continue;
    }

    // Build metadata from remaining properties
    const metadata: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(props)) {
      if (key !== timestampField && key !== 'value' && key !== 'val') {
        metadata[key] = val;
      }
    }

    points.push({
      geometry: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      timestamp,
      temporalPrecision: precision,
      value,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });
  }

  return { points, errors };
}
