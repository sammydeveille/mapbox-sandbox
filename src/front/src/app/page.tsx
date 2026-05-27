'use client';

import { Suspense, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { useTRPC } from '@/lib/trpc';
import { useMapShell } from '@/components/MapShell';
import { CollectionList } from '@/components/collections/CollectionList';
import { DataLayerPanel } from '@/components/collections/DataLayerPanel';
import { LayerRenderer, type DataPoint } from '@/components/map/LayerRenderer';
import { PlaybackSlider } from '@/components/temporal/PlaybackSlider';
import { CSVImport } from '@/components/import/CSVImport';
import { GeoJSONImport } from '@/components/import/GeoJSONImport';
import { APIFetchForm } from '@/components/import/APIFetchForm';
import { ManualEntry } from '@/components/import/ManualEntry';
import { DataView } from '@/components/import/DataView';
import { SearchView } from '@/components/SearchView';
import { SearchDetailView } from '@/components/SearchDetailView';
import { KnowledgeSearchPanel } from '@/components/knowledge/KnowledgeSearchPanel';
import { KnowledgeDetailView } from '@/components/knowledge/KnowledgeDetailView';
import { PresentationList } from '@/components/presentation/PresentationList';
import { PresentationEditor } from '@/components/presentation/PresentationEditor';
import { PresentationPlayer } from '@/components/presentation/PresentationPlayer';
import { SpatialOverlayRenderer, type SpatialOverlay } from '@/components/map/SpatialOverlayRenderer';
import { SpatialFilterIndicator } from '@/components/map/SpatialFilterIndicator';
import { TemporalContextBar } from '@/components/temporal/TemporalContextBar';
import { MapPopup, type MapPopupData } from '@/components/map/MapPopup';
import { computeCentroid, type SupportedGeometry } from '@/utils/geometryHelpers';

type ImportTab = 'data' | 'csv' | 'geojson' | 'api' | 'manual';

// What the right detail panel shows
type DetailView =
  | null
  | { type: 'search-detail'; pageId: number; title: string }
  | { type: 'knowledge-detail'; itemId: string }
  | { type: 'data-layer-detail'; collectionId: string; layerId: string }
  | { type: 'presentation-editor'; presentationId: string }
  | { type: 'presentation-player'; presentationId: string };

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { profileId } = useProfile();
  const { map, flyTo, fitBounds, projection, setProjection, setMapPadding, stopIdleRotation, startIdleRotation } = useMapShell();
  const trpc = useTRPC();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ─── Detail panel state ─────────────────────────────────────────────────────
  const [detailView, setDetailView] = useState<DetailView>(null);

  // ─── Search state ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') ?? '');
  const [wikiQuery, setWikiQuery] = useState<string | null>(searchParams?.get('q') ?? null);
  const searchMarkerRef = useRef<any>(null);

  // ─── Map overlay state ──────────────────────────────────────────────────────
  const [spatialFilterBbox, setSpatialFilterBbox] = useState<[number, number, number, number] | null>(null);
  const [popupData, setPopupData] = useState<MapPopupData | null>(null);
  const [playerPosition, setPlayerPosition] = useState(1);

  // ─── Collection / Layer state ───────────────────────────────────────────────
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    searchParams?.get('collection') ?? null
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    searchParams?.get('layer') ?? null
  );
  const [timeWindow, setTimeWindow] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [importTab, setImportTab] = useState<ImportTab>('data');
  const [playbackTimeEnd, setPlaybackTimeEnd] = useState<string | null>(null);
  const lastFitLayerRef = useRef<string | null>(null);
  const fittedForLayerRef = useRef<string | null>(null);

  // ─── Derived: is player active ──────────────────────────────────────────────
  const isPlayerActive = detailView?.type === 'presentation-player';
  const selectedPresentationId =
    detailView?.type === 'presentation-editor' || detailView?.type === 'presentation-player'
      ? detailView.presentationId
      : null;

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: collections } = useQuery({
    ...trpc.collection.list.queryOptions({ ownerId: profileId ?? 'placeholder' }),
    enabled: !!profileId,
  });
  const selectedCollection = collections?.find((c) => c.id === selectedCollectionId);

  const { data: layers } = useQuery({
    ...trpc.dataLayer.list.queryOptions({
      collectionId: selectedCollectionId ?? 'placeholder',
      ownerId: profileId ?? 'placeholder',
    }),
    enabled: !!selectedCollectionId && !!profileId,
  });

  const queryInput = {
    layerIds: selectedLayerId ? [selectedLayerId] : ['placeholder'],
    timeStart: timeWindow.start || undefined,
    timeEnd: timeWindow.end || undefined,
  };
  const { data: dataPoints } = useQuery({
    ...trpc.dataPoint.query.queryOptions(queryInput),
    enabled: !!selectedLayerId,
  });

  // Presentation player queries
  const { data: selectedPresentation } = useQuery({
    ...trpc.presentation.get.queryOptions({ id: selectedPresentationId ?? '' }),
    enabled: !!selectedPresentationId && isPlayerActive,
  });
  const playerTotalSlides = selectedPresentation?.slides?.length ?? 0;

  const { data: playerSlideData } = useQuery({
    ...trpc.presentation.navigate.queryOptions({
      presentationId: selectedPresentationId ?? '',
      position: playerPosition,
    }),
    enabled: !!selectedPresentationId && isPlayerActive && playerTotalSlides > 0,
  });

  // ─── Derived data ───────────────────────────────────────────────────────────
  const playerSpatialOverlays: SpatialOverlay[] = useMemo(() => {
    if (!playerSlideData?.items) return [];
    const items = playerSlideData.items as unknown as Array<{
      id: string; title: string | null; summary: string | null;
      itemType: string | null; slideItemId: string;
      places: Array<{ id: string; geometry: GeoJSON.Geometry; place_name: string | null }>;
    }>;
    const overlays: SpatialOverlay[] = [];
    for (const item of items) {
      if (!item.places || item.places.length === 0) continue;
      for (const place of item.places) {
        if (!place.geometry) continue;
        overlays.push({
          id: place.id, knowledgeItemId: item.id,
          itemType: (item.itemType as SpatialOverlay['itemType']) ?? 'article',
          title: item.title ?? 'Untitled', summary: item.summary ?? '',
          geometry: place.geometry, placeName: place.place_name ?? undefined,
        });
      }
    }
    return overlays;
  }, [playerSlideData?.items]);

  const playerTemporalWindow = useMemo(() => {
    if (!playerSlideData?.slide?.viewState) return null;
    const vs = playerSlideData.slide.viewState as { temporalStart?: string; temporalEnd?: string };
    if (vs.temporalStart && vs.temporalEnd) return { start: vs.temporalStart, end: vs.temporalEnd };
    return null;
  }, [playerSlideData?.slide?.viewState]);

  const derivedTemporalBounds = useMemo(() => {
    if (selectedCollection?.temporalStart && selectedCollection?.temporalEnd) {
      return {
        start: new Date(selectedCollection.temporalStart).toISOString(),
        end: new Date(selectedCollection.temporalEnd).toISOString(),
      };
    }
    if (Array.isArray(dataPoints) && dataPoints.length > 0) {
      const timestamps = dataPoints.map((dp) => new Date(dp.timestamp as string).getTime()).filter((t) => !isNaN(t));
      if (timestamps.length > 0) {
        return { start: new Date(Math.min(...timestamps)).toISOString(), end: new Date(Math.max(...timestamps)).toISOString() };
      }
    }
    return { start: '', end: '' };
  }, [selectedCollection, dataPoints]);

  const windowStart = useMemo(
    () => (timeWindow.start ? new Date(timeWindow.start) : derivedTemporalBounds.start ? new Date(derivedTemporalBounds.start) : new Date('2020-01-01')),
    [timeWindow.start, derivedTemporalBounds.start]
  );
  const windowEnd = useMemo(
    () => (timeWindow.end ? new Date(timeWindow.end) : derivedTemporalBounds.end ? new Date(derivedTemporalBounds.end) : new Date('2025-01-01')),
    [timeWindow.end, derivedTemporalBounds.end]
  );

  const dataTimestamps = useMemo(() => {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) return [];
    return [...dataPoints].map((dp) => new Date(dp.timestamp as string)).filter((d) => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
  }, [dataPoints]);

  const dataBounds = useMemo<[number, number, number, number] | null>(() => {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) return null;
    let west = 180, south = 90, east = -180, north = -90;
    for (const dp of dataPoints) {
      const geom = dp.geometry as { type: string; coordinates: unknown };
      if (!geom) continue;
      if (geom.type === 'Point') {
        const [lng, lat] = geom.coordinates as [number, number];
        if (lng < west) west = lng; if (lng > east) east = lng;
        if (lat < south) south = lat; if (lat > north) north = lat;
      } else if (geom.type === 'Polygon') {
        for (const ring of geom.coordinates as [number, number][][]) {
          for (const [lng, lat] of ring) {
            if (lng < west) west = lng; if (lng > east) east = lng;
            if (lat < south) south = lat; if (lat > north) north = lat;
          }
        }
      } else if (geom.type === 'LineString') {
        for (const [lng, lat] of geom.coordinates as [number, number][]) {
          if (lng < west) west = lng; if (lng > east) east = lng;
          if (lat < south) south = lat; if (lat > north) north = lat;
        }
      }
    }
    if (west > east) return null;
    return [west, south, east, north];
  }, [dataPoints]);

  const activeLayer = layers?.find((l) => l.id === selectedLayerId);
  const activeLayerProjection = activeLayer?.projection as 'globe' | 'mercator' | undefined;

  const mappedDataPoints: DataPoint[] = useMemo(() => {
    if (!Array.isArray(dataPoints)) return [];
    let filtered = dataPoints;
    if (playbackTimeEnd) {
      const cutoff = new Date(playbackTimeEnd).getTime();
      filtered = dataPoints.filter((dp) => new Date(dp.timestamp as string).getTime() <= cutoff);
    }
    return filtered.map((dp) => ({
      id: dp.id as string,
      geometry: dp.geometry as unknown as GeoJSON.Geometry,
      timestamp: typeof dp.timestamp === 'string' ? dp.timestamp : new Date(dp.timestamp as string).toISOString(),
      value: dp.value as number,
    }));
  }, [dataPoints, playbackTimeEnd]);

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedCollectionId && !detailView) {
      // Don't auto-open detail panel on load — just keep the collection selected in the left nav
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dataBounds) return;
    if (lastFitLayerRef.current && lastFitLayerRef.current !== fittedForLayerRef.current) {
      fittedForLayerRef.current = lastFitLayerRef.current;
      fitBounds(dataBounds);
    }
  }, [dataBounds, fitBounds]);

  useEffect(() => {
    if (activeLayerProjection) setProjection(activeLayerProjection);
  }, [activeLayerProjection, setProjection]);

  // Clear spatial filter when leaving knowledge search detail
  useEffect(() => {
    if (detailView?.type !== 'knowledge-detail') {
      setSpatialFilterBbox(null);
    }
  }, [detailView]);

  // Update map padding when detail panel opens/closes
  useEffect(() => {
    if (detailView) {
      // Center map between left nav (280px) and right panel (420px)
      setMapPadding({ left: 290, right: 430 });
    } else {
      // No panels blocking — center the map fully
      setMapPadding({ left: 0, right: 0 });
    }
  }, [detailView, setMapPadding]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleOverlayClick = useCallback((overlay: SpatialOverlay) => {
    const centroid = computeCentroid(overlay.geometry as SupportedGeometry);
    setPopupData({ title: overlay.title, summary: overlay.summary, coordinates: centroid });
  }, []);

  const handlePopupClose = useCallback(() => setPopupData(null), []);

  const handleSpatialFilterChange = useCallback((bbox: [number, number, number, number] | null) => {
    setSpatialFilterBbox(bbox);
  }, []);

  const handlePlayerSlideChange = useCallback((position: number) => {
    setPlayerPosition(position);
    setPopupData(null);
  }, []);

  const handlePlaybackPositionChange = useCallback((position: Date) => {
    setPlaybackTimeEnd(position.toISOString());
  }, []);

  const handlePointClick = useCallback((point: { id: string; geometry: unknown; timestamp: string; value: number }) => {
    if (!map) return;
    const geom = point.geometry as { type: string; coordinates: unknown };
    if (!geom) return;
    let center: [number, number] | null = null;
    if (geom.type === 'Point') center = geom.coordinates as [number, number];
    else if (geom.type === 'Polygon') {
      const ring = (geom.coordinates as number[][][])[0];
      const lngs = ring.map(c => c[0]); const lats = ring.map(c => c[1]);
      center = [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
    } else if (geom.type === 'LineString') {
      const coords = geom.coordinates as number[][]; const mid = coords[Math.floor(coords.length / 2)];
      center = [mid[0], mid[1]];
    }
    if (center) map.flyTo({ center, zoom: 10, duration: 3000 });
  }, [map]);

  const handleCollectionSelect = useCallback((collectionId: string) => {
    stopIdleRotation();
    setSelectedCollectionId(collectionId);
    setSelectedLayerId(null);
    router.replace(`?collection=${collectionId}`, { scroll: false });
  }, [router, stopIdleRotation]);

  const handleLayerSelect = useCallback((layerId: string) => {
    setSelectedLayerId(layerId);
    lastFitLayerRef.current = layerId;
    if (selectedCollectionId) {
      setDetailView({ type: 'data-layer-detail', collectionId: selectedCollectionId, layerId });
    }
    router.replace(`?collection=${selectedCollectionId}&layer=${layerId}`, { scroll: false });
  }, [router, selectedCollectionId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setWikiQuery(searchQuery.trim());
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('q', searchQuery.trim());
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setWikiQuery(null);
    setDetailView(null);
    // Remove marker
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.delete('q');
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
    // Zoom out to default view, then start rotation once complete
    if (map) {
      // Small delay to let padding change settle before starting flyTo
      setTimeout(() => {
        map.flyTo({ center: [-0.1278, 51.5074], zoom: 2.8, pitch: 0, bearing: -10, duration: 3000 });
        map.once('moveend', () => {
          startIdleRotation();
        });
      }, 100);
    }
  }, [map, router, startIdleRotation]);

  const handleSidebarWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (!profileId) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Initializing profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Map layer renderers */}
      {activeLayer && selectedLayerId && map && (
        <LayerRenderer
          map={map}
          layerId={selectedLayerId}
          renderType={activeLayer.renderType as 'point' | 'heatmap' | 'choropleth' | 'route' | 'cluster'}
          dataPoints={mappedDataPoints}
        />
      )}
      {isPlayerActive && playerSpatialOverlays.length > 0 && (
        <SpatialOverlayRenderer overlays={playerSpatialOverlays} onOverlayClick={handleOverlayClick} />
      )}
      {isPlayerActive && <MapPopup data={popupData} onClose={handlePopupClose} />}
      {spatialFilterBbox && <SpatialFilterIndicator bbox={spatialFilterBbox} />}
      {isPlayerActive && playerTemporalWindow && (
        <TemporalContextBar temporalStart={playerTemporalWindow.start} temporalEnd={playerTemporalWindow.end} />
      )}

      {/* ═══ TOP-LEFT NAVIGATION PANEL ═══ */}
      <aside
        onWheel={handleSidebarWheel}
        className="absolute top-3 left-3 z-10 w-[280px] max-h-[calc(100vh-80px)] flex flex-col rounded-2xl shadow-2xl bg-bg-secondary/80 backdrop-blur-md overflow-hidden"
      >
        {/* Search bar */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/10 dark:bg-white/5 border border-gray-200/20 dark:border-gray-700/30 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
              />
              {(searchQuery || wikiQuery) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors text-sm leading-none"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-3 space-y-1">
          {/* Search results (inline, when a query is active) */}
          {wikiQuery && (
            <div className="max-h-[45vh] overflow-y-auto styled-scrollbar">
              <SearchView
                query={wikiQuery}
                selectedPageId={detailView?.type === 'search-detail' ? detailView.pageId : null}
                onSelectResult={(pageId, title, coordinates) => {
                  setDetailView({ type: 'search-detail', pageId, title });
                  // Remove previous marker immediately
                  if (searchMarkerRef.current) {
                    searchMarkerRef.current.remove();
                    searchMarkerRef.current = null;
                  }
                  // Only fly to location if coordinates are available
                  if (coordinates) {
                    // Pick zoom level based on geographic type/dimension
                    const zoom = getZoomForCoordinates(coordinates);
                    // Defer flyTo to let padding change settle first
                    setTimeout(() => {
                      flyTo(coordinates.lng, coordinates.lat, zoom);
                    }, 150);
                    // Place marker after flyTo animation completes
                    setTimeout(() => {
                      if (!map) return;
                      import('mapbox-gl').then((mapboxgl) => {
                        const el = document.createElement('div');
                        el.style.width = '14px';
                        el.style.height = '14px';
                        el.style.borderRadius = '50%';
                        el.style.border = '2.5px solid';
                        el.style.borderColor = document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937';
                        el.style.backgroundColor = document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,0.15)' : 'rgba(31,41,55,0.1)';
                        el.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.3)';

                        const marker = new mapboxgl.default.Marker({ element: el })
                          .setLngLat([coordinates.lng, coordinates.lat])
                          .addTo(map);
                        searchMarkerRef.current = marker;
                      });
                    }, 3250);
                  }
                }}
              />
            </div>
          )}

          {/* Collections + Data Layers */}
          <CollectionList
            profileId={profileId}
            onSelect={handleCollectionSelect}
            selectedId={selectedCollectionId}
          />

          {selectedCollectionId && (
            <div className="px-1 mt-1">
              <DataLayerPanel
                collectionId={selectedCollectionId}
                profileId={profileId}
                selectedLayerId={selectedLayerId}
                onLayerSelect={handleLayerSelect}
              />
            </div>
          )}

          {/* Presentations section */}
          <NavSection
            title="Presentations"
            icon=""
            onAdd={() => setDetailView({ type: 'presentation-editor', presentationId: '__new__' })}
          >
            <PresentationNavList
              profileId={profileId}
              onSelect={(id) => setDetailView({ type: 'presentation-editor', presentationId: id })}
              selectedId={detailView?.type === 'presentation-editor' ? detailView.presentationId : null}
            />
          </NavSection>

          {/* Knowledge search — hidden for now, not user-ready */}
          {/* <button
            onClick={() => setDetailView({ type: 'knowledge-detail', itemId: '__search__' })}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-text-primary hover:bg-white/5 transition-colors text-left"
          >
            <span>Knowledge Search</span>
          </button> */}
        </div>
      </aside>

      {/* ═══ RIGHT DETAIL PANEL ═══ */}
      {detailView && (
        <aside
          onWheel={handleSidebarWheel}
          className="absolute top-3 right-3 z-30 w-[420px] max-h-[calc(100vh-24px)] flex flex-col rounded-2xl shadow-2xl bg-bg-secondary/80 backdrop-blur-md overflow-hidden"
        >
          {/* Close button */}
          <div className="flex items-center justify-between px-3 pt-3 pb-1 flex-shrink-0">
            <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">
              {detailView.type === 'search-detail' && detailView.title}
              {detailView.type === 'knowledge-detail' && 'Knowledge'}
              {detailView.type === 'data-layer-detail' && 'Data Layer'}
              {detailView.type === 'presentation-editor' && 'Presentation'}
              {detailView.type === 'presentation-player' && 'Player'}
            </span>
            <button
              onClick={() => setDetailView(null)}
              className="text-text-secondary hover:text-text-primary transition-colors text-lg leading-none px-1"
              aria-label="Close panel"
            >
              ×
            </button>
          </div>

          {/* Detail content */}
          <div className="flex-1 overflow-y-auto min-h-0 styled-scrollbar">
            {/* Search result detail (Wikipedia article) */}
            {detailView.type === 'search-detail' && (
              <SearchDetailView pageId={detailView.pageId} />
            )}

            {/* Knowledge search / detail */}
            {detailView.type === 'knowledge-detail' && detailView.itemId === '__search__' && (
              <KnowledgeSearchPanel
                onSelectItem={(itemId) => setDetailView({ type: 'knowledge-detail', itemId })}
                onSpatialFilterChange={handleSpatialFilterChange}
              />
            )}
            {detailView.type === 'knowledge-detail' && detailView.itemId !== '__search__' && (
              <KnowledgeDetailView
                itemId={detailView.itemId}
                onBack={() => setDetailView({ type: 'knowledge-detail', itemId: '__search__' })}
              />
            )}

            {/* Data layer detail — import tools */}
            {detailView.type === 'data-layer-detail' && (
              <div className="px-3 py-2 space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">
                  {activeLayer?.name ?? 'Layer'} — Data
                </h3>
                <div className="flex flex-wrap gap-1 mb-3">
                  {(['data', 'csv', 'geojson', 'api', 'manual'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setImportTab(tab)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        importTab === tab
                          ? 'bg-blue-600 text-white'
                          : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                {importTab === 'data' && (
                  <DataView dataPoints={mappedDataPoints} layerName={activeLayer?.name} renderType={activeLayer?.renderType} currentTime={playbackTimeEnd} onPointClick={handlePointClick} />
                )}
                {importTab === 'csv' && <CSVImport layerId={detailView.layerId} profileId={profileId} />}
                {importTab === 'geojson' && <GeoJSONImport layerId={detailView.layerId} profileId={profileId} />}
                {importTab === 'api' && <APIFetchForm layerId={detailView.layerId} profileId={profileId} />}
                {importTab === 'manual' && <ManualEntry layerId={detailView.layerId} profileId={profileId} />}
              </div>
            )}

            {/* Presentation editor */}
            {detailView.type === 'presentation-editor' && detailView.presentationId !== '__new__' && (
              <PresentationEditor
                presentationId={detailView.presentationId}
                onPlay={(id) => setDetailView({ type: 'presentation-player', presentationId: id })}
                onBack={() => setDetailView(null)}
              />
            )}
            {detailView.type === 'presentation-editor' && detailView.presentationId === '__new__' && (
              <div className="p-3">
                <PresentationList
                  ownerId={profileId}
                  collectionId={selectedCollectionId ?? undefined}
                  onSelectPresentation={(id) => setDetailView({ type: 'presentation-editor', presentationId: id })}
                />
              </div>
            )}

            {/* Presentation player */}
            {detailView.type === 'presentation-player' && (
              <PresentationPlayer
                presentationId={detailView.presentationId}
                totalSlides={playerTotalSlides}
                onBackToEditor={() => setDetailView({ type: 'presentation-editor', presentationId: detailView.presentationId })}
                onSlideChange={handlePlayerSlideChange}
              />
            )}
          </div>
        </aside>
      )}

      {/* ═══ BOTTOM PLAYBAR ═══ */}
      {selectedLayerId && Array.isArray(dataPoints) && dataPoints.length > 0 && (
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-full shadow-lg px-6 py-3 flex items-center bg-bg-secondary/80 backdrop-blur-md border border-gray-200/20 dark:border-gray-700/30"
        style={{ width: 'min(640px, calc(100% - 640px))' }}
      >
        <PlaybackSlider
          windowStart={windowStart}
          windowEnd={windowEnd}
          timestamps={dataTimestamps}
          onPositionChange={handlePlaybackPositionChange}
          onReset={() => setPlaybackTimeEnd(null)}
        />
      </div>
      )}
    </>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function NavSection({
  title,
  icon,
  onAdd,
  children,
}: {
  title: string;
  icon: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="select-none">
      <div className="flex items-center justify-between px-2 mb-0.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
            className={`transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
          >
            <path d="M3 1.5L7 5L3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {icon && <span className="text-base opacity-70 mr-0.5">{icon}</span>}
          {title}
        </button>
        {onAdd && (
          <button
            onClick={onAdd}
            className="text-text-secondary hover:text-text-primary text-lg leading-none transition-colors px-1"
            aria-label={`New ${title.toLowerCase()}`}
          >
            +
          </button>
        )}
      </div>
      {expanded && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

/**
 * Determines appropriate zoom level based on Wikipedia coordinate metadata.
 * Uses the `type` field (city, country, landmark, etc.) and `dim` (dimension in meters).
 */
function getZoomForCoordinates(coords: { type?: string; dim?: number }): number {
  // If dimension is available, derive zoom from it (dim = approximate extent in meters)
  if (coords.dim) {
    if (coords.dim >= 1_000_000) return 4;   // continent/large country
    if (coords.dim >= 300_000) return 4;     // country
    if (coords.dim >= 100_000) return 5;     // large region/state
    if (coords.dim >= 30_000) return 8;      // region/metro area
    if (coords.dim >= 10_000) return 10;     // city
    if (coords.dim >= 1_000) return 13;      // neighborhood
    return 15;                                // landmark/building
  }

  // Fall back to type-based zoom
  switch (coords.type) {
    case 'country': return 4;
    case 'adm1st': return 5;       // first-level admin (state/province)
    case 'adm2nd': return 8;       // second-level admin (county)
    case 'city': return 10;
    case 'airport': return 12;
    case 'mountain': return 11;
    case 'isle': return 8;
    case 'waterbody': return 7;
    case 'landmark': return 14;
    case 'edu': return 14;
    default: return 10;
  }
}

function PresentationNavList({
  profileId,
  onSelect,
  selectedId,
}: {
  profileId: string;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const trpc = useTRPC();
  const { data: presentations, isLoading } = useQuery(
    trpc.presentation.list.queryOptions({ ownerId: profileId })
  );

  if (isLoading) {
    return <p className="text-text-secondary text-xs px-3 py-1">Loading...</p>;
  }

  if (!presentations || presentations.length === 0) {
    return <p className="text-text-secondary text-xs px-3 py-1">No presentations yet.</p>;
  }

  return (
    <>
      {presentations.map((pres) => (
        <button
          key={pres.id}
          onClick={() => onSelect(pres.id)}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors text-left ${
            selectedId === pres.id
              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium'
              : 'text-text-primary hover:bg-white/5'
          }`}
        >
          <span className="truncate">{pres.title}</span>
        </button>
      ))}
    </>
  );
}
