import { z } from 'zod';

export const renderTypeSchema = z.enum(['point', 'heatmap', 'choropleth', 'route', 'cluster']);
export type RenderType = z.infer<typeof renderTypeSchema>;

export const temporalPrecisionSchema = z.enum(['year', 'month', 'day', 'hour', 'instant']);
export type TemporalPrecision = z.infer<typeof temporalPrecisionSchema>;

export const geoJsonPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180), // longitude
    z.number().min(-90).max(90),   // latitude
  ]),
});
export type GeoJsonPoint = z.infer<typeof geoJsonPointSchema>;

export const geoJsonLineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(
    z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
  ).min(2),
});
export type GeoJsonLineString = z.infer<typeof geoJsonLineStringSchema>;

export const geoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(
    z.array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])).min(4)
  ).min(1),
});
export type GeoJsonPolygon = z.infer<typeof geoJsonPolygonSchema>;

export const geoJsonGeometrySchema = z.discriminatedUnion('type', [
  geoJsonPointSchema,
  geoJsonLineStringSchema,
  geoJsonPolygonSchema,
]);
export type GeoJsonGeometry = z.infer<typeof geoJsonGeometrySchema>;

export const bboxSchema = z.tuple([
  z.number().min(-180).max(180), // west
  z.number().min(-90).max(90),   // south
  z.number().min(-180).max(180), // east
  z.number().min(-90).max(90),   // north
]);
export type Bbox = z.infer<typeof bboxSchema>;

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  temporalStart: z.string().datetime().optional(),
  temporalEnd: z.string().datetime().optional(),
  spatialBounds: geoJsonPolygonSchema.optional(),
  presentation: z.record(z.unknown()).optional(),
});
export type CreateCollection = z.infer<typeof createCollectionSchema>;

export const updateCollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  temporalStart: z.string().datetime().optional(),
  temporalEnd: z.string().datetime().optional(),
  spatialBounds: geoJsonPolygonSchema.optional(),
  presentation: z.record(z.unknown()).optional(),
});
export type UpdateCollection = z.infer<typeof updateCollectionSchema>;

export const createDataLayerSchema = z.object({
  collectionId: z.string().uuid(),
  name: z.string().min(1).max(255),
  renderType: renderTypeSchema,
  schemaHint: z.record(z.unknown()).optional(),
});
export type CreateDataLayer = z.infer<typeof createDataLayerSchema>;

export const createDataPointSchema = z.object({
  layerId: z.string().uuid(),
  geometry: geoJsonGeometrySchema,
  timestamp: z.string().datetime(),
  temporalPrecision: temporalPrecisionSchema,
  value: z.number().finite(),
  metadata: z.record(z.unknown()).optional(),
  mediaUrl: z.string().url().optional(),
});
export type CreateDataPoint = z.infer<typeof createDataPointSchema>;

export const spatialTemporalQuerySchema = z.object({
  layerIds: z.array(z.string().uuid()).min(1),
  bbox: bboxSchema.optional(),
  center: z.tuple([z.number(), z.number()]).optional(),
  radius: z.number().positive().optional(),
  timeStart: z.string().datetime().optional(),
  timeEnd: z.string().datetime().optional(),
});
export type SpatialTemporalQuery = z.infer<typeof spatialTemporalQuerySchema>;

export const csvColumnMappingSchema = z.object({
  latitudeColumn: z.string(),
  longitudeColumn: z.string(),
  timestampColumn: z.string(),
  valueColumn: z.string(),
  metadataColumns: z.array(z.string()).optional(),
  temporalPrecision: temporalPrecisionSchema,
});
export type CsvColumnMapping = z.infer<typeof csvColumnMappingSchema>;
