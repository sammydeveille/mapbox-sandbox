'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useMapShell } from '@/components/MapShell';
import { getItemTypeStyle } from '@/utils/itemTypeStyles';

/**
 * Represents a spatial overlay to render on the map.
 */
export interface SpatialOverlay {
  id: string;
  knowledgeItemId: string;
  itemType: 'article' | 'event' | 'statistic' | 'concept' | 'place';
  title: string;
  summary: string;
  geometry: GeoJSON.Geometry;
  placeName?: string;
}

interface SpatialOverlayRendererProps {
  overlays: SpatialOverlay[];
  onOverlayClick?: (overlay: SpatialOverlay) => void;
}

/**
 * Generates a unique source ID for an overlay.
 */
function sourceId(overlayId: string): string {
  return `spatial-overlay-source-${overlayId}`;
}

/**
 * Generates a unique layer ID for an overlay based on geometry type.
 */
function layerId(overlayId: string, type: 'circle' | 'fill' | 'line'): string {
  return `spatial-overlay-${type}-${overlayId}`;
}

/**
 * Generates a dash array for the given map pattern.
 * Used to distinguish item types without relying on color alone.
 */
function getDashArray(mapPattern: 'solid' | 'striped' | 'dotted'): number[] | undefined {
  switch (mapPattern) {
    case 'striped':
      return [2, 2];
    case 'dotted':
      return [0.5, 1.5];
    case 'solid':
    default:
      return undefined;
  }
}

/**
 * SpatialOverlayRenderer renders knowledge item geometries on the Mapbox GL map.
 *
 * - Point geometries are rendered as circle markers
 * - Polygon/MultiPolygon geometries are rendered as filled overlays with boundary strokes
 * - Each item type gets a distinct visual style (color + pattern)
 * - Layers are cleaned up on slide change or unmount
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.6
 */
export function SpatialOverlayRenderer({ overlays, onOverlayClick }: SpatialOverlayRendererProps) {
  const { map } = useMapShell();
  const addedSourcesRef = useRef<string[]>([]);
  const addedLayersRef = useRef<string[]>([]);
  const onOverlayClickRef = useRef(onOverlayClick);
  onOverlayClickRef.current = onOverlayClick;

  /**
   * Removes all currently rendered sources and layers from the map.
   */
  const cleanup = useCallback((mapInstance: mapboxgl.Map) => {
    // Remove layers first (layers depend on sources)
    for (const id of addedLayersRef.current) {
      try {
        if (mapInstance.getLayer(id)) {
          mapInstance.removeLayer(id);
        }
      } catch {
        // Layer may already be removed if style changed
      }
    }
    // Remove sources
    for (const id of addedSourcesRef.current) {
      try {
        if (mapInstance.getSource(id)) {
          mapInstance.removeSource(id);
        }
      } catch {
        // Source may already be removed if style changed
      }
    }
    addedLayersRef.current = [];
    addedSourcesRef.current = [];
  }, []);

  /**
   * Adds all overlay sources and layers to the map.
   */
  const renderOverlays = useCallback(
    (mapInstance: mapboxgl.Map) => {
      // Clean up previous overlays first (Req 6.2)
      cleanup(mapInstance);

      // If no overlays, do nothing (Req 6.3)
      if (overlays.length === 0) return;

      for (const overlay of overlays) {
        const style = getItemTypeStyle(overlay.itemType);
        const srcId = sourceId(overlay.id);

        // Add GeoJSON source for this overlay
        try {
          mapInstance.addSource(srcId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: overlay.geometry,
              properties: {
                id: overlay.id,
                knowledgeItemId: overlay.knowledgeItemId,
                title: overlay.title,
                summary: overlay.summary,
                itemType: overlay.itemType,
              },
            },
          });
          addedSourcesRef.current.push(srcId);
        } catch {
          // Source may already exist after a rapid re-render
          continue;
        }

        const geometryType = overlay.geometry.type;

        if (geometryType === 'Point') {
          // Render Point as circle marker (Req 6.1)
          const circleLayerId = layerId(overlay.id, 'circle');
          const dashArray = getDashArray(style.mapPattern);

          mapInstance.addLayer({
            id: circleLayerId,
            type: 'circle',
            source: srcId,
            paint: {
              'circle-radius': 8,
              'circle-color': style.mapColor,
              'circle-opacity': 0.85,
              'circle-stroke-width': dashArray ? 3 : 2,
              'circle-stroke-color': dashArray ? '#ffffff' : style.mapColor,
              'circle-stroke-opacity': 1,
            },
          });
          addedLayersRef.current.push(circleLayerId);

          // Add click handler
          mapInstance.on('click', circleLayerId, (e) => {
            if (onOverlayClickRef.current) {
              onOverlayClickRef.current(overlay);
            }
          });

          // Cursor pointer on hover
          mapInstance.on('mouseenter', circleLayerId, () => {
            mapInstance.getCanvas().style.cursor = 'pointer';
          });
          mapInstance.on('mouseleave', circleLayerId, () => {
            mapInstance.getCanvas().style.cursor = '';
          });
        } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
          // Render Polygon/MultiPolygon as filled overlay with boundary stroke (Req 6.1)
          const fillLayerId = layerId(overlay.id, 'fill');
          const lineLayerId = layerId(overlay.id, 'line');
          const dashArray = getDashArray(style.mapPattern);

          // Fill layer
          mapInstance.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: srcId,
            paint: {
              'fill-color': style.mapColor,
              'fill-opacity': 0.25,
            },
          });
          addedLayersRef.current.push(fillLayerId);

          // Boundary stroke layer (Req 6.1 - visible boundary stroke)
          const lineLayerConfig: mapboxgl.AnyLayer = {
            id: lineLayerId,
            type: 'line',
            source: srcId,
            paint: {
              'line-color': style.mapColor,
              'line-width': 2.5,
              'line-opacity': 0.9,
              ...(dashArray ? { 'line-dasharray': dashArray } : {}),
            },
          };
          mapInstance.addLayer(lineLayerConfig as any);
          addedLayersRef.current.push(lineLayerId);

          // Add click handler on fill layer
          mapInstance.on('click', fillLayerId, (e) => {
            if (onOverlayClickRef.current) {
              onOverlayClickRef.current(overlay);
            }
          });

          // Cursor pointer on hover
          mapInstance.on('mouseenter', fillLayerId, () => {
            mapInstance.getCanvas().style.cursor = 'pointer';
          });
          mapInstance.on('mouseleave', fillLayerId, () => {
            mapInstance.getCanvas().style.cursor = '';
          });
        }
      }
    },
    [overlays, cleanup],
  );

  useEffect(() => {
    if (!map) return;

    const apply = () => {
      try {
        renderOverlays(map);
      } catch {
        // If style isn't loaded yet, wait for it
      }
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('style.load', apply);
    }

    return () => {
      // Clean up on unmount or when overlays change (Req 6.2)
      if (!map) return;
      try {
        if (map.getStyle()) {
          cleanup(map);
        }
      } catch {
        // Map may have been removed
      }
    };
  }, [map, renderOverlays, cleanup]);

  // This component renders nothing to the DOM — it only manages map layers
  return null;
}
