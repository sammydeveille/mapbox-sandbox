'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type mapboxgl from 'mapbox-gl';

interface MapContainerProps {
  mapboxToken: string;
  darkMode?: boolean;
  onBoundsChange?: (bounds: [number, number, number, number]) => void;
  onMapReady?: (map: mapboxgl.Map) => void;
  fitBounds?: [number, number, number, number] | null; // [west, south, east, north]
  initialCenter?: [number, number];
  initialZoom?: number;
  children?: ReactNode;
}

const DEFAULT_CENTER: [number, number] = [-0.1278, 51.5074];
const DEFAULT_ZOOM = 10;

export function MapContainer({
  mapboxToken,
  darkMode,
  onBoundsChange,
  onMapReady,
  fitBounds,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  children,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onMapReadyRef = useRef(onMapReady);
  const darkModeRef = useRef(darkMode);
  onBoundsChangeRef.current = onBoundsChange;
  onMapReadyRef.current = onMapReady;

  useEffect(() => {
    if (!mapboxToken || !containerRef.current || mapRef.current) return;

    import('mapbox-gl').then((mapboxgl) => {
      if (!containerRef.current) return;

      mapboxgl.default.accessToken = mapboxToken;

      const map = new mapboxgl.default.Map({
        container: containerRef.current,
        style: darkModeRef.current ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
        center: initialCenter,
        zoom: initialZoom,
      });

      mapRef.current = map;

      const handleMoveEnd = () => {
        const mapBounds = map.getBounds();
        if (!mapBounds) return;

        const bounds: [number, number, number, number] = [
          mapBounds.getWest(),
          mapBounds.getSouth(),
          mapBounds.getEast(),
          mapBounds.getNorth(),
        ];

        onBoundsChangeRef.current?.(bounds);
      };

      map.on('load', () => {
        // Offset the map center to account for the left sidebar (320px)
        map.setPadding({ left: 320, top: 0, right: 0, bottom: 0 });
        handleMoveEnd();
        onMapReadyRef.current?.(map);
      });
      map.on('moveend', handleMoveEnd);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  // Fit map to bounds when fitBounds prop changes
  useEffect(() => {
    if (!mapRef.current || !fitBounds) return;
    const [west, south, east, north] = fitBounds;
    if (west === east && south === north) return;
    mapRef.current.fitBounds(
      [[west, south], [east, north]],
      { padding: { top: 50, bottom: 60, left: 350, right: 50 }, maxZoom: 12, duration: 1000 }
    );
  }, [fitBounds]);

  // Switch map style when dark mode changes
  useEffect(() => {
    if (!mapRef.current) return;
    const style = darkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';
    mapRef.current.setStyle(style);
  }, [darkMode]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      {children}
    </div>
  );
}
