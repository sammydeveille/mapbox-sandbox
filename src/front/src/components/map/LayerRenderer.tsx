'use client';

import { useEffect, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';

export type RenderType = 'point' | 'heatmap' | 'choropleth' | 'route' | 'cluster';

export interface DataPoint {
  id: string;
  geometry: GeoJSON.Geometry;
  timestamp: string;
  value: number;
}

interface LayerRendererProps {
  map: mapboxgl.Map | null;
  layerId: string;
  renderType: RenderType;
  dataPoints: DataPoint[];
}

function toFeatureCollection(dataPoints: DataPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: dataPoints.map((dp) => ({
      type: 'Feature' as const,
      id: dp.id,
      geometry: dp.geometry,
      properties: {
        id: dp.id,
        timestamp: dp.timestamp,
        value: dp.value,
      },
    })),
  };
}

function toRouteFeatureCollection(dataPoints: DataPoint[]): GeoJSON.FeatureCollection {
  const sorted = [...dataPoints].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const coordinates = sorted
    .map((dp) => {
      if (dp.geometry.type === 'Point') {
        return dp.geometry.coordinates;
      }
      return null;
    })
    .filter((c): c is GeoJSON.Position => c !== null);

  if (coordinates.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {},
      },
    ],
  };
}

function addPointLayer(map: mapboxgl.Map, sourceId: string, layerId: string) {
  map.addLayer({
    id: layerId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'value'],
        0, 4,
        50, 8,
        100, 14,
      ],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'value'],
        0, '#2dc4b2',
        25, '#3bb3c3',
        50, '#669ec4',
        75, '#8b88b6',
        100, '#a2719b',
      ],
      'circle-opacity': 0.8,
    },
  });
}

function addHeatmapLayer(map: mapboxgl.Map, sourceId: string, layerId: string) {
  map.addLayer({
    id: layerId,
    type: 'heatmap',
    source: sourceId,
    paint: {
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'value'],
        0, 0,
        100, 1,
      ],
      'heatmap-intensity': 1,
      'heatmap-radius': 20,
      'heatmap-opacity': 0.7,
    },
  });
}

function addClusterLayers(map: mapboxgl.Map, sourceId: string, layerId: string) {
  // Cluster circles
  map.addLayer({
    id: `${layerId}-clusters`,
    type: 'circle',
    source: sourceId,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#51bbd6',
        10, '#f1f075',
        50, '#f28cb1',
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        15,
        10, 20,
        50, 25,
      ],
    },
  });

  // Cluster count labels
  map.addLayer({
    id: `${layerId}-cluster-count`,
    type: 'symbol',
    source: sourceId,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-size': 12,
    },
  });

  // Unclustered points
  map.addLayer({
    id: `${layerId}-unclustered`,
    type: 'circle',
    source: sourceId,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#11b4da',
      'circle-radius': 6,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff',
    },
  });
}

function addRouteLayer(map: mapboxgl.Map, sourceId: string, layerId: string) {
  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': '#3887be',
      'line-width': 3,
      'line-opacity': 0.8,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
  });
}

function addChoroplethLayer(map: mapboxgl.Map, sourceId: string, layerId: string) {
  map.addLayer({
    id: layerId,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['get', 'value'],
        0, '#f7fcf5',
        25, '#c7e9c0',
        50, '#74c476',
        75, '#238b45',
        100, '#00441b',
      ],
      'fill-opacity': 0.6,
    },
  });
}

function removeLayers(map: mapboxgl.Map, layerId: string) {
  const layerIds = [
    layerId,
    `${layerId}-clusters`,
    `${layerId}-cluster-count`,
    `${layerId}-unclustered`,
  ];

  for (const id of layerIds) {
    if (map.getLayer(id)) {
      map.removeLayer(id);
    }
  }
}

function removeSource(map: mapboxgl.Map, sourceId: string) {
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function LayerRenderer({ map, layerId, renderType, dataPoints }: LayerRendererProps) {
  const prevRenderTypeRef = useRef<RenderType | null>(null);

  useEffect(() => {
    if (!map) return;

    const sourceId = `source-${layerId}`;

    const apply = () => {
      // Clean up existing layers and source if render type changed or on re-render
      removeLayers(map, layerId);
      removeSource(map, sourceId);

      if (dataPoints.length === 0) return;

      // Add source and layers based on render type
      if (renderType === 'cluster') {
        map.addSource(sourceId, {
          type: 'geojson',
          data: toFeatureCollection(dataPoints),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });
        addClusterLayers(map, sourceId, layerId);
      } else if (renderType === 'route') {
        map.addSource(sourceId, {
          type: 'geojson',
          data: toRouteFeatureCollection(dataPoints),
        });
        addRouteLayer(map, sourceId, layerId);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: toFeatureCollection(dataPoints),
        });

        switch (renderType) {
          case 'point':
            addPointLayer(map, sourceId, layerId);
            break;
          case 'heatmap':
            addHeatmapLayer(map, sourceId, layerId);
            break;
          case 'choropleth':
            addChoroplethLayer(map, sourceId, layerId);
            break;
        }
      }

      prevRenderTypeRef.current = renderType;
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('style.load', apply);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (!map || !map.getStyle()) return;
      removeLayers(map, layerId);
      removeSource(map, sourceId);
    };
  }, [map, layerId, renderType, dataPoints]);

  // This component manages map layers imperatively; it renders nothing to the DOM
  return null;
}
