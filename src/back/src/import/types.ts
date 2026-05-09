import type { TemporalPrecision, GeoJsonGeometry } from '../types/spatiotemporal.js';

export interface DataPointInput {
  geometry: GeoJsonGeometry;
  timestamp: string; // ISO 8601
  temporalPrecision: TemporalPrecision;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface ImportResult {
  success: number;
  skipped: Array<{ row: number; reason: string }>;
  total: number;
}
