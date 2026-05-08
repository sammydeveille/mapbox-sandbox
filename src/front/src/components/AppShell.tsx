'use client';

import { useRef, useState, useEffect, createContext, useContext } from 'react';
import mapboxgl from 'mapbox-gl';
import { Map } from './Map';
import { Menu } from './Menu';
import { URLViewer } from './URLViewer';

interface AppShellContext {
  onLocationSearch: (lng: number, lat: number) => void;
  onOpenViewer: (url: string, title: string, source: string) => void;
}

const AppShellContext = createContext<AppShellContext>({
  onLocationSearch: () => {},
  onOpenViewer: () => {},
});

export function useAppShell() {
  return useContext(AppShellContext);
}

interface AppShellProps {
  mapboxToken: string;
  children: React.ReactNode;
}

export function AppShell({ mapboxToken, children }: AppShellProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);
  const [viewerSource, setViewerSource] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const handleMapReady = (map: mapboxgl.Map) => {
    mapRef.current = map;
  };

  const handleLocationSearch = (lng: number, lat: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 10 });
    }
  };

  const handleOpenViewer = (url: string, title: string, source: string) => {
    setViewerUrl(url);
    setViewerTitle(title);
    setViewerSource(source);
  };

  return (
    <AppShellContext.Provider value={{ onLocationSearch: handleLocationSearch, onOpenViewer: handleOpenViewer }}>
      <Map accessToken={mapboxToken} onMapReady={handleMapReady} darkMode={darkMode} />
      <div
        className="fixed left-0 top-0 w-1/3 h-full bg-bg-primary shadow-2xl z-10 overflow-y-auto backdrop-blur-md"
        style={{ backgroundColor: 'rgba(var(--color-bg-primary), 0.85)' }}
      >
        <Menu darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />
        <div className="p-6 text-text-primary">{children}</div>
      </div>
      {viewerUrl && (
        <URLViewer
          url={viewerUrl}
          title={viewerTitle}
          source={viewerSource}
          onClose={() => {
            setViewerUrl(null);
            setViewerTitle(null);
            setViewerSource(null);
          }}
        />
      )}
    </AppShellContext.Provider>
  );
}
