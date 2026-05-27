import { z } from 'zod';

// ─── Source Schemas (6.1) ────────────────────────────────────────────────────

export const sourceTypeSchema = z.enum(['api', 'website', 'database', 'file', 'manual']);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const createSourceSchema = z.object({
  name: z.string().trim().min(1).max(255),
  baseUrl: z.string().url(),
  sourceType: sourceTypeSchema,
});
export type CreateSource = z.infer<typeof createSourceSchema>;

export const createSourceDocumentSchema = z.object({
  sourceId: z.string().uuid(),
  externalId: z.string().min(1).max(500),
  rawContent: z.record(z.unknown()),
});
export type CreateSourceDocument = z.infer<typeof createSourceDocumentSchema>;

// ─── Knowledge Item Schemas (6.1) ───────────────────────────────────────────

export const itemTypeSchema = z.enum(['article', 'event', 'statistic', 'concept', 'place']);
export type ItemType = z.infer<typeof itemTypeSchema>;

export const createKnowledgeItemSchema = z.object({
  title: z.string().trim().min(1).max(255).refine(
    (val) => val.trim().length >= 1,
    { message: 'Title must contain at least one non-whitespace character' }
  ),
  summary: z.string().min(1).max(2000),
  itemType: itemTypeSchema,
  content: z.string().optional(),
});
export type CreateKnowledgeItem = z.infer<typeof createKnowledgeItemSchema>;

export const relevanceSchema = z.enum(['primary', 'supporting', 'contextual']);
export type Relevance = z.infer<typeof relevanceSchema>;

export const createItemEvidenceSchema = z.object({
  knowledgeItemId: z.string().uuid(),
  sourceDocumentId: z.string().uuid(),
  relevance: relevanceSchema,
  excerpt: z.string().max(500).optional(),
});
export type CreateItemEvidence = z.infer<typeof createItemEvidenceSchema>;

// ─── Temporal Schemas (6.2) ──────────────────────────────────────────────────

export const temporalPrecisionSchema = z.enum(['year', 'month', 'day', 'hour', 'exact']);
export type TemporalPrecision = z.infer<typeof temporalPrecisionSchema>;

export const createItemTimeSchema = z.object({
  knowledgeItemId: z.string().uuid(),
  startTime: z.union([z.string().datetime(), z.date()]),
  endTime: z.union([z.string().datetime(), z.date()]).optional(),
  precision: temporalPrecisionSchema,
}).refine(
  (data) => {
    if (data.endTime === undefined) return true;
    const start = data.startTime instanceof Date ? data.startTime : new Date(data.startTime);
    const end = data.endTime instanceof Date ? data.endTime : new Date(data.endTime);
    return start <= end;
  },
  { message: 'startTime must be less than or equal to endTime', path: ['endTime'] }
);
export type CreateItemTime = z.infer<typeof createItemTimeSchema>;

// ─── Spatial Schemas (6.3) ───────────────────────────────────────────────────

export const spatialPrecisionSchema = z.enum(['exact', 'approximate', 'region']);
export type SpatialPrecision = z.infer<typeof spatialPrecisionSchema>;

export const pointGeometrySchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180), // longitude
    z.number().min(-90).max(90),   // latitude
  ]),
});

export const polygonGeometrySchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

export const multiPolygonGeometrySchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(z.tuple([z.number(), z.number()])))),
});

export const geoJsonGeometrySchema = z.discriminatedUnion('type', [
  pointGeometrySchema,
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
]);
export type GeoJsonGeometry = z.infer<typeof geoJsonGeometrySchema>;

export const createItemPlaceSchema = z.object({
  knowledgeItemId: z.string().uuid(),
  geometry: geoJsonGeometrySchema,
  placeName: z.string().max(512).optional(),
  precision: spatialPrecisionSchema,
});
export type CreateItemPlace = z.infer<typeof createItemPlaceSchema>;

// ─── Presentation Schemas (6.4) ─────────────────────────────────────────────

export const viewStateSchema = z.object({
  center: z.tuple([
    z.number().min(-180).max(180), // longitude
    z.number().min(-90).max(90),   // latitude
  ]),
  zoom: z.number().min(0).max(22),
  bearing: z.number().min(0).max(360).optional(),
  pitch: z.number().min(0).max(85).optional(),
  temporalStart: z.string().datetime().optional(),
  temporalEnd: z.string().datetime().optional(),
  activeLayerIds: z.array(z.string().uuid()).optional(),
});
export type ViewState = z.infer<typeof viewStateSchema>;

export const createPresentationSchema = z.object({
  collectionId: z.string().uuid().optional(),
  ownerId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});
export type CreatePresentation = z.infer<typeof createPresentationSchema>;

export const createPresentationSlideSchema = z.object({
  presentationId: z.string().uuid(),
  position: z.number().int().positive(),
  title: z.string().max(255).optional(),
  narratorNote: z.string().max(2000).optional(),
  viewState: viewStateSchema,
});
export type CreatePresentationSlide = z.infer<typeof createPresentationSlideSchema>;

export const createSlideItemSchema = z.object({
  slideId: z.string().uuid(),
  knowledgeItemId: z.string().uuid(),
  position: z.number().int().positive(),
  annotation: z.string().max(1000).optional(),
});
export type CreateSlideItem = z.infer<typeof createSlideItemSchema>;

// ─── Search Schema (6.5) ────────────────────────────────────────────────────

export const searchQuerySchema = z.object({
  text: z.string().optional(),
  bbox: z.tuple([
    z.number().min(-180).max(180), // west
    z.number().min(-90).max(90),   // south
    z.number().min(-180).max(180), // east
    z.number().min(-90).max(90),   // north
  ]).optional(),
  timeStart: z.string().datetime().optional(),
  timeEnd: z.string().datetime().optional(),
  itemTypes: z.array(itemTypeSchema).optional(),
  page: z.number().int().min(0).default(0).optional(),
  pageSize: z.number().int().min(1).max(100).default(20).optional(),
}).refine(
  (data) => {
    return !!(data.text || data.bbox || data.timeStart || data.timeEnd);
  },
  { message: 'At least one of text, bbox, timeStart, or timeEnd must be provided' }
);
export type SearchQuery = z.infer<typeof searchQuerySchema>;
