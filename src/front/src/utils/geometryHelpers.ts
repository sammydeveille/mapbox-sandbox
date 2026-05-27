/**
 * GeoJSON geometry utilities for centroid calculation and type labeling.
 *
 * Used by KnowledgeDetailView for flyTo on spatial bindings and
 * SpatialOverlayRenderer for marker placement.
 */

export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

export type SupportedGeometry = PointGeometry | PolygonGeometry | MultiPolygonGeometry;

/**
 * Clamps a value to the given range [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Computes the centroid of a GeoJSON geometry.
 *
 * - Point: returns the point's coordinates exactly.
 * - Polygon: computes the average of the exterior ring coordinates.
 * - MultiPolygon: computes the average of all polygon centroids.
 *
 * The returned longitude is clamped to [-180, 180] and latitude to [-90, 90].
 */
export function computeCentroid(geometry: SupportedGeometry): [number, number] {
  let lng: number;
  let lat: number;

  switch (geometry.type) {
    case 'Point': {
      lng = geometry.coordinates[0];
      lat = geometry.coordinates[1];
      break;
    }
    case 'Polygon': {
      const ring = geometry.coordinates[0];
      if (!ring || ring.length === 0) {
        return [0, 0];
      }
      const [sumLng, sumLat] = ring.reduce(
        ([accLng, accLat], coord) => [accLng + coord[0], accLat + coord[1]],
        [0, 0],
      );
      lng = sumLng / ring.length;
      lat = sumLat / ring.length;
      break;
    }
    case 'MultiPolygon': {
      const polygons = geometry.coordinates;
      if (polygons.length === 0) {
        return [0, 0];
      }
      const centroids = polygons.map((polygon) => {
        const ring = polygon[0];
        if (!ring || ring.length === 0) {
          return [0, 0] as [number, number];
        }
        const [sumLng, sumLat] = ring.reduce(
          ([accLng, accLat], coord) => [accLng + coord[0], accLat + coord[1]],
          [0, 0],
        );
        return [sumLng / ring.length, sumLat / ring.length] as [number, number];
      });
      const [totalLng, totalLat] = centroids.reduce(
        ([accLng, accLat], [cLng, cLat]) => [accLng + cLng, accLat + cLat],
        [0, 0],
      );
      lng = totalLng / centroids.length;
      lat = totalLat / centroids.length;
      break;
    }
  }

  return [clamp(lng, -180, 180), clamp(lat, -90, 90)];
}

/**
 * Returns a human-readable label for the geometry type.
 *
 * - Point → "Point"
 * - Polygon → "Polygon"
 * - MultiPolygon → "Bounding Box"
 */
export function getGeometryTypeLabel(geometry: SupportedGeometry): string {
  switch (geometry.type) {
    case 'Point':
      return 'Point';
    case 'Polygon':
      return 'Polygon';
    case 'MultiPolygon':
      return 'Bounding Box';
  }
}
