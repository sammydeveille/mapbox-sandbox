'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useDarkMode } from '@/hooks/useDarkMode';
import { ProfileButton } from './ProfileButton';
import type mapboxgl from 'mapbox-gl';

type Projection = 'globe' | 'mercator';

// Styles by dark mode (remove projection setting from these styles in Mapbox Studio)
// In Mapbox Studio: Style Settings → uncheck/remove the projection override
const STYLES = {
  light: 'mapbox://styles/sdevmb/cmp7dog9z001601qt0kyq3qwj',
  dark: 'mapbox://styles/sdevmb/cmp7cm53g006j01s608ct092m',
} as const;

interface MapShellContextValue {
  map: mapboxgl.Map | null;
  darkMode: boolean;
  toggleDarkMode: () => void;
  projection: Projection;
  toggleProjection: () => void;
  setProjection: (p: Projection) => void;
  profileId: string | null;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  fitBounds: (bounds: [number, number, number, number]) => void;
  setMapPadding: (padding: { left?: number; right?: number; top?: number; bottom?: number }) => void;
  stopIdleRotation: () => void;
  startIdleRotation: () => void;
  geoFirst: boolean;
  toggleGeoFirst: () => void;
}

const MapShellContext = createContext<MapShellContextValue>({
  map: null,
  darkMode: false,
  toggleDarkMode: () => {},
  projection: 'globe',
  toggleProjection: () => {},
  setProjection: () => {},
  profileId: null,
  flyTo: () => {},
  fitBounds: () => {},
  setMapPadding: () => {},
  stopIdleRotation: () => {},
  startIdleRotation: () => {},
  geoFirst: true,
  toggleGeoFirst: () => {},
});

export function useMapShell() {
  return useContext(MapShellContext);
}

interface MapShellProps {
  mapboxToken: string;
  children: ReactNode;
}

export function MapShell({ mapboxToken, children }: MapShellProps) {
  const { profileId } = useProfile();
  const { darkMode, toggle: toggleDarkMode } = useDarkMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [projection, setProjection] = useState<Projection>('globe');
  const projectionRef = useRef<Projection>('globe');
  const [mapInfo, setMapInfo] = useState({ zoom: 0, pitch: 0, bearing: 0 });
  const [geoFirst, setGeoFirst] = useState(true);

  const toggleGeoFirst = useCallback(() => {
    setGeoFirst((prev) => !prev);
  }, []);

  // Idle rotation state
  const rotationRef = useRef<number | null>(null);
  const isRotatingRef = useRef(true);
  const spinFnRef = useRef<(() => void) | null>(null);

  const stopIdleRotation = useCallback(() => {
    if (!isRotatingRef.current) return;
    isRotatingRef.current = false;
    if (rotationRef.current !== null) {
      cancelAnimationFrame(rotationRef.current);
      rotationRef.current = null;
    }
  }, []);

  const startIdleRotation = useCallback(() => {
    if (isRotatingRef.current) return; // already rotating
    if (!mapRef.current) return;
    if (projectionRef.current === 'mercator') return; // no rotation in mercator
    isRotatingRef.current = true;
    if (spinFnRef.current) {
      rotationRef.current = requestAnimationFrame(spinFnRef.current);
    }
  }, []);

  // Always start in globe projection
  // (localStorage preference is only used to persist within a session after user changes it)

  // Keep projection ref in sync
  useEffect(() => {
    projectionRef.current = projection;
  }, [projection]);

  const toggleProjection = () => {
    setProjection((prev) => {
      const next = prev === 'globe' ? 'mercator' : 'globe';
      localStorage.setItem('mapProjection', next);
      if (next === 'mercator') {
        stopIdleRotation();
      } else {
        // Start rotation after the easeTo animation finishes
        if (mapRef.current) {
          mapRef.current.once('moveend', () => startIdleRotation());
        }
      }
      return next;
    });
  };

  const setProjectionValue = useCallback((p: Projection) => {
    setProjection(p);
    localStorage.setItem('mapProjection', p);
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!mapboxToken || !containerRef.current || mapRef.current) return;

    import('mapbox-gl').then((mapboxgl) => {
      if (!containerRef.current || mapRef.current) return;

      mapboxgl.default.accessToken = mapboxToken;

      const map = new mapboxgl.default.Map({
        container: containerRef.current,
        style: STYLES[darkMode ? 'dark' : 'light'],
        center: [-0.1278, 51.5074],
        zoom: 2.8,
        pitch: 0,
        bearing: -10,
      });

      mapRef.current = map;

      map.on('load', () => {
        map.setPadding({ left: 290, top: 0, right: 430, bottom: 0 });
        // Set projection after map is fully loaded
        map.setProjection(projection as any);
        setMapInstance(map);

        const updateInfo = () => {
          setMapInfo({
            zoom: map.getZoom(),
            pitch: map.getPitch(),
            bearing: map.getBearing(),
          });
        };
        updateInfo();
        map.on('move', updateInfo);

        // Start idle rotation (slow spin around the globe)
        const spinGlobe = () => {
          if (!isRotatingRef.current) return;
          const center = map.getCenter();
          center.lng += 0.05; // degrees per frame at ~60fps ≈ 3°/sec
          map.setCenter(center);
          rotationRef.current = requestAnimationFrame(spinGlobe);
        };
        spinFnRef.current = spinGlobe;
        // Small delay before starting rotation for a smooth entrance
        setTimeout(() => {
          if (isRotatingRef.current) {
            rotationRef.current = requestAnimationFrame(spinGlobe);
          }
        }, 1500);

        // Stop rotation on any user interaction with the map
        const stopOnInteraction = () => {
          stopIdleRotation();
          // Clean up listeners after first interaction
          map.off('mousedown', stopOnInteraction);
          map.off('touchstart', stopOnInteraction);
          map.off('wheel', stopOnInteraction);
          map.off('zoomstart', stopOnZoom);
        };
        const stopOnZoom = (e: any) => {
          // Only stop if user-initiated (not programmatic)
          if (e.originalEvent) stopOnInteraction();
        };
        map.on('mousedown', stopOnInteraction);
        map.on('touchstart', stopOnInteraction);
        map.on('wheel', stopOnInteraction);
        map.on('zoomstart', stopOnZoom);
      });
    });

    return () => {
      if (rotationRef.current !== null) {
        cancelAnimationFrame(rotationRef.current);
        rotationRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapInstance(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  // Switch map style when dark mode changes — re-apply projection after style loads
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    map.setStyle(STYLES[darkMode ? 'dark' : 'light']);
    map.once('style.load', () => {
      // Delay slightly to ensure style projection is fully applied before overriding
      setTimeout(() => {
        map.setProjection(projection as any);
      }, 100);
    });
  }, [darkMode, projection]);

  // Switch projection
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const applyProjection = () => {
      map.setProjection(projection as any);
      if (projection === 'mercator') {
        // Center the full mercator view elegantly
        map.easeTo({ center: [0, 20], zoom: 1.5, pitch: 0, bearing: 0, duration: 1200 });
      } else {
        // Return to globe idle state
        map.easeTo({ center: [0, 20], zoom: 2.8, pitch: 0, bearing: -10, duration: 1200 });
      }
    };

    if (map.isStyleLoaded()) {
      applyProjection();
    } else {
      map.once('style.load', () => {
        setTimeout(applyProjection, 100);
      });
    }
  }, [projection]);

  const flyTo = (lng: number, lat: number, zoom = 10) => {
    stopIdleRotation();
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 5000 });
  };

  const mapPaddingRef = useRef({ left: 290, right: 430, top: 0, bottom: 0 });

  const setMapPadding = useCallback((padding: { left?: number; right?: number; top?: number; bottom?: number }) => {
    mapPaddingRef.current = { ...mapPaddingRef.current, ...padding };
    if (mapRef.current) {
      mapRef.current.setPadding(mapPaddingRef.current);
    }
  }, []);

  const fitBoundsHandler = (bounds: [number, number, number, number]) => {
    if (!mapRef.current) return;
    stopIdleRotation();
    const [west, south, east, north] = bounds;
    if (west === east && south === north) return;
    const p = mapPaddingRef.current;
    mapRef.current.fitBounds(
      [[west, south], [east, north]],
      { padding: { top: p.top + 50, bottom: p.bottom + 60, left: p.left + 10, right: p.right + 10 }, maxZoom: 12, duration: 1000 }
    );
  };

  return (
    <MapShellContext.Provider value={{ map: mapInstance, darkMode, toggleDarkMode, projection, toggleProjection, setProjection: setProjectionValue, profileId, flyTo, fitBounds: fitBoundsHandler, setMapPadding, stopIdleRotation, startIdleRotation, geoFirst, toggleGeoFirst }}>
      <div className="h-screen relative text-text-primary overflow-hidden">
        {/* Persistent map */}
        <div ref={containerRef} className="absolute inset-0 z-0" />

        {/* Profile button - top right */}
        <div className="absolute top-4 right-4 z-20">
          <ProfileButton
            profileId={profileId}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            projection={projection}
            onToggleProjection={toggleProjection}
            mapInfo={mapInfo}
            geoFirst={geoFirst}
            onToggleGeoFirst={toggleGeoFirst}
          />
        </div>

        {/* Page content (sidebar + overlays) */}
        {children}
      </div>
    </MapShellContext.Provider>
  );
}
