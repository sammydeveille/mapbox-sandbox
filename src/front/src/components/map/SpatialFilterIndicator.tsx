'use client';

import { useEffect } from 'react';
import { useMapShell } from '../MapShell';

const SOURCE_ID = 'spatial-filter-bounds';
const LAYER_ID = 'spatial-filter-bounds-line';

interface SpatialFilterIndicatorProps {
  bbox: [number, number, number, number] | null; // [west, south, east, north]
}

function bboxToPolygon(bbox: [number, number, number, number]): GeoJSON.Feature<GeoJSON.Polygon> {
  const [west, south, east, north] = bbox;
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ]],
    },
  };
}

function removeFilterLayer(map: mapboxgl.Map) {
  if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

export function SpatialFilterIndicator({ bbox }: SpatialFilterIndicatorProps) {
  const { map } = useMapShell();

  useEffect(() => {
    if (!map) return;

    const apply = () => {
      removeFilterLayer(map);

      if (!bbox) return;

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: bboxToPolygon(bbox),
      });

      map.addLayer({
        id: LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.8,
        },
      });
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('style.load', apply);
    }

    return () => {
      if (!map || !map.getStyle()) return;
      removeFilterLayer(map);
    };
  }, [map, bbox]);

  return null;
}
