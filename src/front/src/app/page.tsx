'use client';

import { Suspense, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { useTRPC } from '@/lib/trpc';
import { useMapShell } from '@/components/MapShell';
import { LayerRenderer, type DataPoint } from '@/components/map/LayerRenderer';
import { PlaybackSlider } from '@/components/temporal/PlaybackSlider';
import { SearchView } from '@/components/SearchView';
import { SearchDetailView } from '@/components/SearchDetailView';
import { SpatialOverlayRenderer, type SpatialOverlay } from '@/components/map/SpatialOverlayRenderer';
import { SpatialFilterIndicator } from '@/components/map/SpatialFilterIndicator';
import { TemporalContextBar } from '@/components/temporal/TemporalContextBar';
import { MapPopup, type MapPopupData } from '@/components/map/MapPopup';
import { computeCentroid, type SupportedGeometry } from '@/utils/geometryHelpers';

// A pinned search result that persists across searches
interface PinnedResult {
  pageId: number;
  title: string;
  coordinates?: { lng: number; lat: number; type?: string; dim?: number };
}

// What the right detail panel shows
type DetailView =
  | null
  | { type: 'search-detail'; pageId: number; title: string };

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { profileId } = useProfile();
  const { map, flyTo, fitBounds, projection, setProjection, setMapPadding, stopIdleRotation, startIdleRotation, geoFirst } = useMapShell();
  const trpc = useTRPC();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ─── Detail panel state ─────────────────────────────────────────────────────
  const [detailView, setDetailView] = useState<DetailView>(null);
  const detailViewRef = useRef<DetailView>(null);

  // ─── Search state ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') ?? '');
  const [wikiQuery, setWikiQuery] = useState<string | null>(searchParams?.get('q') ?? null);

  // ─── Pinned results (the user's canvas/board) ───────────────────────────────
  const [pinnedResults, setPinnedResults] = useState<PinnedResult[]>([]);
  const markersRef = useRef<Map<number, any>>(new Map());
  const selectedMarkerRef = useRef<any>(null);
  const selectedCoordsRef = useRef<{ lng: number; lat: number } | null>(null);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleSidebarWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

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
    // Don't clear pinned results or detail view
    const params = new URLSearchParams(window.location.search);
    params.delete('q');
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
    // If no pinned results, zoom out and restart rotation
    if (pinnedResults.length === 0) {
      setDetailView(null);
      if (map) {
        setTimeout(() => {
          map.flyTo({ center: [-0.1278, 51.5074], zoom: 2.8, pitch: 0, bearing: -10, duration: 5000 });
          map.once('moveend', () => startIdleRotation());
        }, 100);
      }
    }
  }, [map, router, startIdleRotation, pinnedResults.length]);

  // Pin a search result to the canvas
  const handlePinResult = useCallback((result: PinnedResult) => {
    setPinnedResults((prev) => {
      if (prev.some((p) => p.pageId === result.pageId)) return prev; // already pinned
      return [...prev, result];
    });
    // Remove the selected marker since pinned markers will handle it
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
  }, []);

  // Unpin a result
  const handleUnpinResult = useCallback((pageId: number) => {
    setPinnedResults((prev) => {
      const next = prev.filter((p) => p.pageId !== pageId);
      // If all pins removed and no search active, restore idle state
      if (next.length === 0 && !wikiQuery) {
        setDetailView(null);
        if (map) {
          setTimeout(() => {
            map.flyTo({ center: [-0.1278, 51.5074], zoom: 2.8, pitch: 0, bearing: -10, duration: 5000 });
            map.once('moveend', () => startIdleRotation());
          }, 100);
        }
      }
      return next;
    });
    // Remove its marker
    const marker = markersRef.current.get(pageId);
    if (marker) {
      marker.remove();
      markersRef.current.delete(pageId);
    }
    // If it was the detail view, close it
    setDetailView((prev) => prev?.type === 'search-detail' && prev.pageId === pageId ? null : prev);
  }, [map, startIdleRotation, wikiQuery]);

  // Select a pinned result — toggle: if already selected, deselect and fit all; otherwise select and fly to it
  const handleSelectPinned = useCallback((result: PinnedResult) => {
    // If already selected, deselect and fit all pins
    if (detailView?.type === 'search-detail' && detailView.pageId === result.pageId) {
      setDetailView(null);
      // Fit to all pinned results after a short delay
      const withCoords = pinnedResults.filter((r) => r.coordinates);
      if (withCoords.length >= 2) {
        let west = 180, south = 90, east = -180, north = -90;
        for (const r of withCoords) {
          const { lng, lat } = r.coordinates!;
          if (lng < west) west = lng;
          if (lng > east) east = lng;
          if (lat < south) south = lat;
          if (lat > north) north = lat;
        }
        setTimeout(() => fitBounds([west, south, east, north]), 200);
      }
      return;
    }
    setDetailView({ type: 'search-detail', pageId: result.pageId, title: result.title });
    if (result.coordinates) {
      const zoom = getZoomForCoordinates(result.coordinates);
      setTimeout(() => flyTo(result.coordinates!.lng, result.coordinates!.lat, zoom), 150);
    }
    // Immediately update marker styles for the pinned marker
    setTimeout(() => {
      updateMarkerStyles(
        { type: 'search-detail', pageId: result.pageId, title: result.title },
        markersRef.current,
        selectedMarkerRef.current
      );
    }, 0);
  }, [flyTo, fitBounds, detailView, pinnedResults]);

  // When a search result is selected: fly to it, show detail, and place a marker
  const handleSelectSearchResult = useCallback((pageId: number, title: string, coordinates?: { lng: number; lat: number; type?: string; dim?: number }) => {
    setDetailView({ type: 'search-detail', pageId, title });
    // Remove previous selected marker (if not pinned)
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
    selectedCoordsRef.current = coordinates ? { lng: coordinates.lng, lat: coordinates.lat } : null;
    if (coordinates) {
      const zoom = getZoomForCoordinates(coordinates);
      setTimeout(() => flyTo(coordinates.lng, coordinates.lat, zoom), 150);
      // Place marker after flyTo completes
      setTimeout(() => {
        if (!map) return;
        // Don't place if already pinned (pinned markers handle it)
        if (markersRef.current.has(pageId)) return;
        import('mapbox-gl').then((mapboxgl) => {
          const isDark = document.documentElement.classList.contains('dark');
          const el = document.createElement('div');
          el.style.width = '18px';
          el.style.height = '18px';
          el.style.borderRadius = '50%';
          el.style.border = '2.5px solid';
          el.style.borderColor = isDark ? '#fff' : '#1f2937';
          el.style.backgroundColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(31,41,55,0.15)';
          el.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.3)';
          el.style.cursor = 'pointer';
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            // Toggle: if this item's panel is already open, close it; otherwise open it
            const current = detailViewRef.current;
            if (current?.type === 'search-detail' && current.pageId === pageId) {
              setDetailView(null);
            } else {
              setDetailView({ type: 'search-detail', pageId, title });
            }
          });
          const marker = new mapboxgl.default.Marker({ element: el })
            .setLngLat([coordinates.lng, coordinates.lat])
            .addTo(map);
          selectedMarkerRef.current = marker;
          // Apply active style immediately
          updateMarkerStyles(detailViewRef.current, markersRef.current, marker);
        });
      }, 5200);
    }
  }, [flyTo, map]);

  // Fit map to show all pinned results with coordinates
  const fitToPinnedResults = useCallback(() => {
    const withCoords = pinnedResults.filter((r) => r.coordinates);
    if (withCoords.length === 0) return;
    if (withCoords.length === 1) {
      const c = withCoords[0].coordinates!;
      const zoom = getZoomForCoordinates(c);
      flyTo(c.lng, c.lat, zoom);
      return;
    }
    // Compute bounding box
    let west = 180, south = 90, east = -180, north = -90;
    for (const r of withCoords) {
      const { lng, lat } = r.coordinates!;
      if (lng < west) west = lng;
      if (lng > east) east = lng;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    }
    fitBounds([west, south, east, north]);
  }, [pinnedResults, flyTo, fitBounds]);

  // ─── Effects ────────────────────────────────────────────────────────────────

  // Update map padding — constant offset for both panels so map centers between them
  useEffect(() => {
    detailViewRef.current = detailView;
    setMapPadding({ left: 290, right: 430 });
    // Update marker visual states
    updateMarkerStyles(detailView, markersRef.current, selectedMarkerRef.current);
  }, [detailView, setMapPadding]);

  // Manage markers for pinned results
  useEffect(() => {
    if (!map) return;

    // Add markers for new pins
    for (const pin of pinnedResults) {
      if (!pin.coordinates) continue;
      if (markersRef.current.has(pin.pageId)) continue;

      import('mapbox-gl').then((mapboxgl) => {
        if (!map) return;
        const isDark = document.documentElement.classList.contains('dark');
        const el = document.createElement('div');
        el.style.width = '18px';
        el.style.height = '18px';
        el.style.borderRadius = '50%';
        el.style.border = '2.5px solid';
        el.style.borderColor = isDark ? '#fff' : '#1f2937';
        el.style.backgroundColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(31,41,55,0.15)';
        el.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.3)';
        el.style.cursor = 'pointer';

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          // Toggle: if this item's panel is already open, close it; otherwise open it
          const current = detailViewRef.current;
          if (current?.type === 'search-detail' && current.pageId === pin.pageId) {
            setDetailView(null);
          } else {
            setDetailView({ type: 'search-detail', pageId: pin.pageId, title: pin.title });
          }
        });

        const marker = new mapboxgl.default.Marker({ element: el })
          .setLngLat([pin.coordinates!.lng, pin.coordinates!.lat])
          .addTo(map);
        markersRef.current.set(pin.pageId, marker);
      });
    }

    // Remove markers for unpinned results
    for (const [pageId, marker] of markersRef.current.entries()) {
      if (!pinnedResults.some((p) => p.pageId === pageId)) {
        marker.remove();
        markersRef.current.delete(pageId);
      }
    }
  }, [map, pinnedResults]);

  // Auto fit-all when 2+ pinned results have coordinates
  useEffect(() => {
    const withCoords = pinnedResults.filter((r) => r.coordinates);
    if (withCoords.length >= 2) {
      // Small delay to let markers render
      setTimeout(() => fitToPinnedResults(), 200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedResults.length]);

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
        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-3 space-y-2 styled-scrollbar">
          {/* Pinned results (the user's canvas) */}
          {pinnedResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                  Pinned ({pinnedResults.length})
                </span>
                {pinnedResults.filter((r) => r.coordinates).length > 1 && (
                  <button
                    onClick={fitToPinnedResults}
                    className="text-[10px] text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    Fit all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 px-1">
                {pinnedResults.map((pin) => (
                  <div key={pin.pageId} className="relative group">
                    <button
                      onClick={() => handleSelectPinned(pin)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition-colors ${
                        detailView?.type === 'search-detail' && detailView.pageId === pin.pageId
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium ring-1 ring-blue-500/30'
                          : 'bg-white/10 dark:bg-white/5 text-text-primary hover:bg-white/15 dark:hover:bg-white/10'
                      }`}
                    >
                      {pin.coordinates && <span className="text-[10px] opacity-60">📍</span>}
                      <span className="truncate max-w-[120px]">{pin.title}</span>
                    </button>
                    <button
                      onClick={() => handleUnpinResult(pin.pageId)}
                      className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded-full bg-red-500/80 text-white text-[10px] leading-none transition-opacity"
                      aria-label={`Remove ${pin.title}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search results */}
          {wikiQuery && (
            <div className="max-h-[45vh] overflow-y-auto styled-scrollbar">
              <SearchView
                query={wikiQuery}
                selectedPageId={detailView?.type === 'search-detail' ? detailView.pageId : null}
                pinnedPageIds={pinnedResults.map((p) => p.pageId)}
                geoFirst={geoFirst}
                onSelectResult={handleSelectSearchResult}
                onPinResult={(pageId, title, coordinates) => {
                  handlePinResult({ pageId, title, coordinates });
                }}
              />
            </div>
          )}
        </div>
      </aside>

      {/* ═══ RIGHT DETAIL PANEL ═══ */}
      {detailView && (
        <aside
          onWheel={handleSidebarWheel}
          className="absolute top-3 right-3 z-30 w-[420px] max-h-[calc(100vh-24px)] flex flex-col rounded-2xl shadow-2xl bg-bg-secondary/80 backdrop-blur-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-1 flex-shrink-0">
            <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold truncate max-w-[70%]">
              {detailView.type === 'search-detail' && detailView.title}
            </span>
            <div className="flex items-center gap-1">
              {/* Pin/unpin button */}
              {detailView.type === 'search-detail' && (() => {
                const isPinned = pinnedResults.some((p) => p.pageId === detailView.pageId);
                return (
                  <button
                    onClick={() => {
                      if (isPinned) {
                        handleUnpinResult(detailView.pageId);
                      } else {
                        handlePinResult({
                          pageId: detailView.pageId,
                          title: detailView.title,
                          coordinates: selectedCoordsRef.current ?? undefined,
                        });
                      }
                    }}
                    className={`p-1 rounded transition-colors ${
                      isPinned ? 'text-blue-500' : 'text-text-secondary hover:text-blue-500'
                    }`}
                    aria-label={isPinned ? 'Unpin' : 'Pin'}
                    title={isPinned ? 'Unpin' : 'Pin to canvas'}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                      <path d="M9.5 1.5L14.5 6.5L10 11L8.5 14.5L1.5 7.5L5 6L10.5 1.5Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                );
              })()}
              {/* Close button */}
              <button
                onClick={() => setDetailView(null)}
                className="text-text-secondary hover:text-text-primary transition-colors text-lg leading-none px-1"
                aria-label="Close panel"
              >
                ×
              </button>
            </div>
          </div>

          {/* Detail content */}
          <div className="flex-1 overflow-y-auto min-h-0 styled-scrollbar">
            {detailView.type === 'search-detail' && (
              <SearchDetailView pageId={detailView.pageId} />
            )}
          </div>
        </aside>
      )}
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determines appropriate zoom level based on Wikipedia coordinate metadata.
 */
function getZoomForCoordinates(coords: { type?: string; dim?: number }): number {
  if (coords.dim) {
    if (coords.dim >= 1_000_000) return 4;
    if (coords.dim >= 300_000) return 4;
    if (coords.dim >= 100_000) return 5;
    if (coords.dim >= 30_000) return 8;
    if (coords.dim >= 10_000) return 10;
    if (coords.dim >= 1_000) return 13;
    return 15;
  }

  switch (coords.type) {
    case 'country': return 4;
    case 'adm1st': return 5;
    case 'adm2nd': return 8;
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

/**
 * Updates marker visual styles to reflect active/inactive state.
 * Active marker (its panel is open) gets a stronger glow; inactive ones are subtler.
 */
function updateMarkerStyles(
  detailView: DetailView,
  pinnedMarkers: Map<number, any>,
  selectedMarker: any
) {
  const activePageId = detailView?.type === 'search-detail' ? detailView.pageId : null;
  const isDark = document.documentElement.classList.contains('dark');

  for (const [pageId, marker] of pinnedMarkers.entries()) {
    const el = marker.getElement() as HTMLElement;
    if (pageId === activePageId) {
      el.style.boxShadow = '0 0 0 5px rgba(59,130,246,0.5)';
      el.style.borderColor = '#3b82f6';
      el.style.backgroundColor = isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)';
    } else {
      el.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.3)';
      el.style.borderColor = isDark ? '#fff' : '#1f2937';
      el.style.backgroundColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(31,41,55,0.15)';
    }
  }

  if (selectedMarker) {
    const el = selectedMarker.getElement() as HTMLElement;
    if (activePageId !== null) {
      el.style.boxShadow = '0 0 0 5px rgba(59,130,246,0.5)';
      el.style.borderColor = '#3b82f6';
      el.style.backgroundColor = isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)';
    } else {
      el.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.3)';
      el.style.borderColor = isDark ? '#fff' : '#1f2937';
      el.style.backgroundColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(31,41,55,0.15)';
    }
  }
}
