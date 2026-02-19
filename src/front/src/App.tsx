import { trpc } from './trpc';
import Map from './components/Map';
import Menu from './components/Menu';
import URLViewer from './components/URLViewer';
import { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

function App({ children }: { children: ((props: { onLocationSearch: (lng: number, lat: number) => void; onOpenViewer: (url: string, title: string, source: string) => void; accessToken: string }) => React.ReactNode) | React.ReactNode }) {
  const mapboxToken = trpc.getMapboxToken.useQuery();
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);
  const [viewerSource, setViewerSource] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    console.log('Initial darkMode:', saved);
    return saved === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      document.documentElement.classList.add('dark');
    }
  }, []);

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
    <>
      {mapboxToken.data?.token && (
        <Map accessToken={mapboxToken.data.token} onMapReady={handleMapReady} darkMode={darkMode} />
      )}
      <div className="fixed left-0 top-0 w-1/3 h-full bg-bg-primary shadow-2xl z-10 overflow-y-auto backdrop-blur-md" style={{ backgroundColor: 'rgba(var(--color-bg-primary), 0.85)' }}>
        <Menu darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />
        <div className="p-6 text-text-primary">
          {typeof children === 'function'
            ? children({ onLocationSearch: handleLocationSearch, onOpenViewer: handleOpenViewer, accessToken: mapboxToken.data?.token || '' })
            : children}
        </div>
      </div>
      {viewerUrl && (
        <URLViewer
          url={viewerUrl}
          title={viewerTitle}
          source={viewerSource}
          onClose={() => { setViewerUrl(null); setViewerTitle(null); setViewerSource(null); }}
        />
      )}
    </>
  );
}

export default App;
