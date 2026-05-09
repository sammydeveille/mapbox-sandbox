import type { CsvColumnMapping } from '../types/spatiotemporal.js';
import type { DataPointInput } from './types.js';

/**
 * Parses CSV content using the provided column mapping and returns valid data points
 * along with any errors encountered during parsing.
 *
 * - Validates coordinates: latitude in [-90, 90], longitude in [-180, 180]
 * - Validates timestamps: must be parseable as a valid date
 * - Validates values: must be a finite number
 * - Skips invalid rows and records them in the errors array
 */
export function parseCSV(
  content: string,
  mapping: CsvColumnMapping
): { points: DataPointInput[]; errors: Array<{ row: number; reason: string }> } {
  const points: DataPointInput[] = [];
  const errors: Array<{ row: number; reason: string }> = [];

  const lines = content.split('\n').map((line) => line.trimEnd());

  if (lines.length === 0) {
    return { points, errors };
  }

  // Parse header row
  const header = parseCsvLine(lines[0]);
  const columnIndex = new Map<string, number>();
  for (let i = 0; i < header.length; i++) {
    columnIndex.set(header[i].trim(), i);
  }

  // Validate that required columns exist in the header
  const latIdx = columnIndex.get(mapping.latitudeColumn);
  const lngIdx = columnIndex.get(mapping.longitudeColumn);
  const tsIdx = columnIndex.get(mapping.timestampColumn);
  const valIdx = columnIndex.get(mapping.valueColumn);

  if (latIdx === undefined) {
    errors.push({ row: 1, reason: `Column "${mapping.latitudeColumn}" not found in header` });
    return { points, errors };
  }
  if (lngIdx === undefined) {
    errors.push({ row: 1, reason: `Column "${mapping.longitudeColumn}" not found in header` });
    return { points, errors };
  }
  if (tsIdx === undefined) {
    errors.push({ row: 1, reason: `Column "${mapping.timestampColumn}" not found in header` });
    return { points, errors };
  }
  if (valIdx === undefined) {
    errors.push({ row: 1, reason: `Column "${mapping.valueColumn}" not found in header` });
    return { points, errors };
  }

  // Resolve metadata column indices
  const metadataIndices: Array<{ name: string; idx: number }> = [];
  if (mapping.metadataColumns) {
    for (const col of mapping.metadataColumns) {
      const idx = columnIndex.get(col);
      if (idx !== undefined) {
        metadataIndices.push({ name: col, idx });
      }
    }
  }

  // Process data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') {
      continue;
    }

    const rowNumber = i + 1; // 1-based row number
    const fields = parseCsvLine(line);

    // Validate latitude
    const latStr = fields[latIdx]?.trim() ?? '';
    const lat = Number(latStr);
    if (!isFinite(lat) || latStr === '') {
      errors.push({ row: rowNumber, reason: `Invalid latitude: "${latStr}"` });
      continue;
    }
    if (lat < -90 || lat > 90) {
      errors.push({ row: rowNumber, reason: `Latitude out of range [-90, 90]: ${lat}` });
      continue;
    }

    // Validate longitude
    const lngStr = fields[lngIdx]?.trim() ?? '';
    const lng = Number(lngStr);
    if (!isFinite(lng) || lngStr === '') {
      errors.push({ row: rowNumber, reason: `Invalid longitude: "${lngStr}"` });
      continue;
    }
    if (lng < -180 || lng > 180) {
      errors.push({ row: rowNumber, reason: `Longitude out of range [-180, 180]: ${lng}` });
      continue;
    }

    // Validate timestamp
    const tsStr = fields[tsIdx]?.trim() ?? '';
    const tsDate = new Date(tsStr);
    if (isNaN(tsDate.getTime()) || tsStr === '') {
      errors.push({ row: rowNumber, reason: `Invalid timestamp: "${tsStr}"` });
      continue;
    }

    // Validate value
    const valStr = fields[valIdx]?.trim() ?? '';
    const value = Number(valStr);
    if (!isFinite(value) || valStr === '') {
      errors.push({ row: rowNumber, reason: `Invalid value: "${valStr}"` });
      continue;
    }

    // Build metadata from mapped columns
    let metadata: Record<string, unknown> | undefined;
    if (metadataIndices.length > 0) {
      metadata = {};
      for (const { name, idx } of metadataIndices) {
        metadata[name] = fields[idx]?.trim() ?? '';
      }
    }

    points.push({
      geometry: {
        type: 'Point',
        coordinates: [lng, lat], // GeoJSON uses [longitude, latitude]
      },
      timestamp: tsDate.toISOString(),
      temporalPrecision: mapping.temporalPrecision,
      value,
      metadata,
    });
  }

  return { points, errors };
}

/**
 * Parses a single CSV line, handling quoted fields with commas and escaped quotes.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote (double quote)
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  fields.push(current);
  return fields;
}
