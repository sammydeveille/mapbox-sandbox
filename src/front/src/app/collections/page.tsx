'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTRPC } from '@/lib/trpc';
import { CollectionList } from '@/components/collections/CollectionList';
import { DataLayerPanel } from '@/components/collections/DataLayerPanel';
import { MapContainer } from '@/components/map/MapContainer';
import { LayerRenderer, type DataPoint } from '@/components/map/LayerRenderer';
import { PlaybackSlider } from '@/components/temporal/PlaybackSlider';
import { CSVImport } from '@/components/import/CSVImport';
import { GeoJSONImport } from '@/components/import/GeoJSONImport';
import { APIFetchForm } from '@/components/import/APIFetchForm';
import { ManualEntry } from '@/components/import/ManualEntry';
import { DataView } from '@/components/import/DataView';
import type mapboxgl from 'mapbox-gl';

type ImportTab = 'data' | 'csv' | 'geojson' | 'api' | 'manual';

export default function CollectionsPage() {
  const { profileId } = useProfile();
  const { darkMode, toggle: toggleDarkMode } = useDarkMode();
  const trpc = useTRPC();

  // State management - read initial values from URL
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    searchParams.get('collection')
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    searchParams.get('layer')
  );
  const [timeWindow, setTimeWindow] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [importTab, setImportTab] = useState<ImportTab>('data');
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [playbackTimeEnd, setPlaybackTimeEnd] = useState<string | null>(null);
  const [pendingFitBounds, setPendingFitBounds] = useState<[number, number, number, number] | null>(null);
  const lastFitLayerRef = useRef<string | null>(null);
  const fittedForLayerRef = useRef<string | null>(null);

  // Fetch Mapbox token from backend
  const { data: tokenData } = useQuery(
    trpc.getMapboxToken.queryOptions()
  );

  // Fetch the selected collection details for temporal bounds
  const { data: collections } = useQuery({
    ...trpc.collection.list.queryOptions({ ownerId: profileId ?? 'placeholder' }),
    enabled: !!profileId,
  });
  const selectedCollection = collections?.find((c) => c.id === selectedCollectionId);

  // Fetch data layers for the selected collection
  const { data: layers } = useQuery({
    ...trpc.dataLayer.list.queryOptions({
      collectionId: selectedCollectionId ?? 'placeholder',
      ownerId: profileId ?? 'placeholder',
    }),
    enabled: !!selectedCollectionId && !!profileId,
  });

  // Query data points with spatial-temporal filters
  // Always query with the full range picker window; playback filters client-side
  const queryInput = {
    layerIds: selectedLayerId ? [selectedLayerId] : ['placeholder'],
    timeStart: timeWindow.start || undefined,
    timeEnd: timeWindow.end || undefined,
  };

  const { data: dataPoints } = useQuery({
    ...trpc.dataPoint.query.queryOptions(queryInput),
    enabled: !!selectedLayerId,
  });

  const handleBoundsChange = useCallback((newBounds: [number, number, number, number]) => {
    setBounds(newBounds);
  }, []);

  const handleTimeWindowChange = useCallback((start: string, end: string) => {
    setTimeWindow({ start, end });
    setPlaybackTimeEnd(null); // Clear playback override when user manually sets range
  }, []);

  const handlePlaybackPositionChange = useCallback((position: Date) => {
    setPlaybackTimeEnd(position.toISOString());
  }, []);

  const handlePointClick = useCallback((point: { id: string; geometry: unknown; timestamp: string; value: number }) => {
    if (!mapInstance) return;
    const geom = point.geometry as { type: string; coordinates: unknown };
    if (!geom) return;
    let center: [number, number] | null = null;
    if (geom.type === 'Point') {
      center = geom.coordinates as [number, number];
    } else if (geom.type === 'Polygon') {
      const ring = (geom.coordinates as number[][][])[0];
      const lngs = ring.map(c => c[0]);
      const lats = ring.map(c => c[1]);
      center = [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
    } else if (geom.type === 'LineString') {
      const coords = geom.coordinates as number[][];
      const mid = coords[Math.floor(coords.length / 2)];
      center = [mid[0], mid[1]];
    }
    if (center) {
      mapInstance.flyTo({ center, zoom: 10, duration: 1000 });
    }
  }, [mapInstance]);

  const handleCollectionSelect = useCallback((collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setSelectedLayerId(null);
    router.replace(`?collection=${collectionId}`, { scroll: false });
  }, [router]);

  const handleLayerSelect = useCallback((layerId: string) => {
    setSelectedLayerId(layerId);
    lastFitLayerRef.current = layerId;
    setPendingFitBounds(null);
    router.replace(`?collection=${selectedCollectionId}&layer=${layerId}`, { scroll: false });
  }, [router, selectedCollectionId]);

  const handleBackToCollections = useCallback(() => {
    setSelectedCollectionId(null);
    setSelectedLayerId(null);
    router.replace('/collections', { scroll: false });
  }, [router]);

  // Derive temporal bounds from collection metadata or loaded data points
  const derivedTemporalBounds = useMemo(() => {
    // First try collection-level bounds
    if (selectedCollection?.temporalStart && selectedCollection?.temporalEnd) {
      return {
        start: new Date(selectedCollection.temporalStart).toISOString(),
        end: new Date(selectedCollection.temporalEnd).toISOString(),
      };
    }
    // Fall back to min/max timestamps from loaded data points
    if (Array.isArray(dataPoints) && dataPoints.length > 0) {
      const timestamps = dataPoints
        .map((dp) => new Date(dp.timestamp as string).getTime())
        .filter((t) => !isNaN(t));
      if (timestamps.length > 0) {
        return {
          start: new Date(Math.min(...timestamps)).toISOString(),
          end: new Date(Math.max(...timestamps)).toISOString(),
        };
      }
    }
    return { start: '', end: '' };
  }, [selectedCollection, dataPoints]);

  // Time window dates for PlaybackSlider (must be before early return to maintain hook order)
  const windowStart = useMemo(
    () => (timeWindow.start ? new Date(timeWindow.start) : derivedTemporalBounds.start ? new Date(derivedTemporalBounds.start) : new Date('2020-01-01')),
    [timeWindow.start, derivedTemporalBounds.start]
  );
  const windowEnd = useMemo(
    () => (timeWindow.end ? new Date(timeWindow.end) : derivedTemporalBounds.end ? new Date(derivedTemporalBounds.end) : new Date('2025-01-01')),
    [timeWindow.end, derivedTemporalBounds.end]
  );

  // Sorted timestamps from data points for prev/next navigation
  const dataTimestamps = useMemo(() => {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) return [];
    return [...dataPoints]
      .map((dp) => new Date(dp.timestamp as string))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
  }, [dataPoints]);

  // Compute bounding box of loaded data points to fit the map
  const dataBounds = useMemo<[number, number, number, number] | null>(() => {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) return null;
    let west = 180, south = 90, east = -180, north = -90;
    for (const dp of dataPoints) {
      const geom = dp.geometry as { type: string; coordinates: unknown };
      if (!geom) continue;
      if (geom.type === 'Point') {
        const [lng, lat] = geom.coordinates as [number, number];
        if (lng < west) west = lng;
        if (lng > east) east = lng;
        if (lat < south) south = lat;
        if (lat > north) north = lat;
      } else if (geom.type === 'Polygon') {
        const rings = geom.coordinates as [number, number][][];
        for (const ring of rings) {
          for (const [lng, lat] of ring) {
            if (lng < west) west = lng;
            if (lng > east) east = lng;
            if (lat < south) south = lat;
            if (lat > north) north = lat;
          }
        }
      } else if (geom.type === 'LineString') {
        const coords = geom.coordinates as [number, number][];
        for (const [lng, lat] of coords) {
          if (lng < west) west = lng;
          if (lng > east) east = lng;
          if (lat < south) south = lat;
          if (lat > north) north = lat;
        }
      }
    }
    if (west > east) return null; // no valid geometries found
    return [west, south, east, north];
  }, [dataPoints]);

  // Fit map to data bounds only once when a new layer's data first loads
  useEffect(() => {
    if (dataBounds && lastFitLayerRef.current && lastFitLayerRef.current !== fittedForLayerRef.current) {
      fittedForLayerRef.current = lastFitLayerRef.current;
      setPendingFitBounds(dataBounds);
    }
  }, [dataBounds]);

  // Map data points to the format expected by LayerRenderer
  // During playback, filter client-side to show only points up to the current position
  const mappedDataPoints: DataPoint[] = useMemo(() => {
    if (!Array.isArray(dataPoints)) return [];
    
    let filtered = dataPoints;
    if (playbackTimeEnd) {
      const cutoff = new Date(playbackTimeEnd).getTime();
      filtered = dataPoints.filter((dp) => {
        const ts = new Date(dp.timestamp as string).getTime();
        return ts <= cutoff;
      });
    }

    return filtered.map((dp) => ({
      id: dp.id as string,
      geometry: dp.geometry as unknown as GeoJSON.Geometry,
      timestamp: typeof dp.timestamp === 'string' ? dp.timestamp : new Date(dp.timestamp as string).toISOString(),
      value: dp.value as number,
    }));
  }, [dataPoints, playbackTimeEnd]);

  // Loading state while profile initializes
  if (!profileId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Initializing profile...</p>
        </div>
      </div>
    );
  }

  // Determine the active layer's render type for the LayerRenderer
  const activeLayer = layers?.find((l) => l.id === selectedLayerId);

  return (
    <div className="h-screen relative text-text-primary overflow-hidden">
      {/* Full-screen map behind everything */}
      <div className="absolute inset-0 z-0">
        {tokenData?.token ? (
          <MapContainer
            mapboxToken={tokenData.token}
            darkMode={darkMode}
            onBoundsChange={handleBoundsChange}
            onMapReady={setMapInstance}
            fitBounds={pendingFitBounds}
          >
            {activeLayer && selectedLayerId && mapInstance && (
              <LayerRenderer
                map={mapInstance}
                layerId={selectedLayerId}
                renderType={activeLayer.renderType as 'point' | 'heatmap' | 'choropleth' | 'route' | 'cluster'}
                dataPoints={mappedDataPoints}
              />
            )}
          </MapContainer>
        ) : null}
      </div>

      {/* Left Sidebar - floating over map */}
      <aside className="absolute top-0 left-0 bottom-0 w-80 z-10 flex flex-col border-r border-gray-200/30 dark:border-gray-700/30 bg-bg-secondary/90 backdrop-blur-md">
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
          <a href="/" className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-1">
            ← Home
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-1 rounded hover:bg-bg-secondary text-sm"
              aria-label="Toggle dark mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <span className="text-sm font-medium text-text-primary">Collections</span>
          </div>
        </div>

        {!selectedCollectionId ? (
          <div className="overflow-y-auto p-4">
            <CollectionList profileId={profileId} onSelect={handleCollectionSelect} />
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Top section: layers */}
            <div className="overflow-y-auto p-4 flex-shrink-0 max-h-[50%]">
              <button
                onClick={handleBackToCollections}
                className="text-sm text-blue-500 hover:underline flex items-center gap-1 mb-4"
              >
                ← Back to Collections
              </button>
              <DataLayerPanel
                collectionId={selectedCollectionId}
                profileId={profileId}
                selectedLayerId={selectedLayerId}
                onLayerSelect={handleLayerSelect}
              />
            </div>

            {/* Bottom section: data & import tabs */}
            {selectedLayerId && (
              <div className="flex flex-col flex-1 min-h-0 border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="flex flex-wrap border-b border-gray-200/50 dark:border-gray-700/50 px-4 pt-3 flex-shrink-0">
                  {(['data', 'csv', 'geojson', 'api', 'manual'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setImportTab(tab)}
                      className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                        importTab === tab
                          ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {tab === 'data' && 'Data'}
                      {tab === 'csv' && 'CSV'}
                      {tab === 'geojson' && 'GeoJSON'}
                      {tab === 'api' && 'API'}
                      {tab === 'manual' && 'Manual'}
                    </button>
                  ))}
                </div>
                <div className="overflow-y-auto flex-1 p-4">
                  {importTab === 'data' && (
                    <DataView
                      dataPoints={mappedDataPoints}
                      layerName={activeLayer?.name}
                      renderType={activeLayer?.renderType}
                      currentTime={playbackTimeEnd}
                      onPointClick={handlePointClick}
                    />
                  )}
                  {importTab === 'csv' && (
                    <CSVImport layerId={selectedLayerId} profileId={profileId} />
                  )}
                  {importTab === 'geojson' && (
                    <GeoJSONImport layerId={selectedLayerId} profileId={profileId} />
                  )}
                  {importTab === 'api' && (
                    <APIFetchForm layerId={selectedLayerId} profileId={profileId} />
                  )}
                  {importTab === 'manual' && (
                    <ManualEntry layerId={selectedLayerId} profileId={profileId} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Bottom-right temporal controls */}
      <div className="absolute bottom-4 z-10 bg-bg-secondary/90 backdrop-blur-md border border-gray-200/30 dark:border-gray-700/30 rounded-lg shadow-lg px-4 py-2 flex items-center gap-3" style={{ left: 'calc(320px + (100% - 320px) / 2)', transform: 'translateX(-50%)' }}>
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={derivedTemporalBounds.start ? new Date(derivedTemporalBounds.start).toISOString().slice(0, 10) : ''}
            onChange={(e) => handleTimeWindowChange(new Date(e.target.value).toISOString(), timeWindow.end || derivedTemporalBounds.end)}
            className="border rounded px-2 py-1 bg-bg-secondary border-gray-300 dark:border-gray-600 text-xs text-text-primary"
          />
          <span className="text-text-secondary">→</span>
          <input
            type="date"
            value={derivedTemporalBounds.end ? new Date(derivedTemporalBounds.end).toISOString().slice(0, 10) : ''}
            onChange={(e) => handleTimeWindowChange(timeWindow.start || derivedTemporalBounds.start, new Date(e.target.value).toISOString())}
            className="border rounded px-2 py-1 bg-bg-secondary border-gray-300 dark:border-gray-600 text-xs text-text-primary"
          />
        </div>
        <div className="flex items-center gap-1 border-l border-gray-200/50 dark:border-gray-700/50 pl-3">
          <PlaybackSlider
            windowStart={windowStart}
            windowEnd={windowEnd}
            timestamps={dataTimestamps}
            onPositionChange={handlePlaybackPositionChange}
            onReset={() => setPlaybackTimeEnd(null)}
          />
        </div>
      </div>
    </div>
  );
}
