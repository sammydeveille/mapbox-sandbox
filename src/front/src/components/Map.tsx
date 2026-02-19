import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  accessToken: string;
  onMapReady?: (map: mapboxgl.Map) => void;
  darkMode?: boolean;
}

function Map({ accessToken, onMapReady, darkMode }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [info, setInfo] = useState({ lng: 0, lat: 0, zoom: 0, pitch: 0, bearing: 0 });

  useEffect(() => {
    if (!accessToken || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = accessToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: darkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
      center: [-0.1278, 51.5074],
      zoom: 10,
      pitch: 48,
      bearing: 13,
    });

    map.current.on('load', () => {
      map.current?.setPadding({ left: window.innerWidth / 3, top: 0, right: 0, bottom: 0 });
      setMapLoaded(true);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.current?.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 13
          });
        },
        () => {
          console.log('Geolocation denied, using default location');
        }
      );
    });

    const updateInfo = () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      setInfo({
        lng: center.lng,
        lat: center.lat,
        zoom: map.current.getZoom(),
        pitch: map.current.getPitch(),
        bearing: map.current.getBearing()
      });
    };

    updateInfo();
    
    const events = ['move', 'zoom', 'rotate', 'pitch'];
    events.forEach(event => map.current?.on(event, updateInfo));

    if (onMapReady) {
      onMapReady(map.current);
    }

    return () => {
      events.forEach(event => map.current?.off(event, updateInfo));
      map.current?.remove();
      map.current = null;
    };
  }, [accessToken]);

  useEffect(() => {
    if (map.current) {
      const currentStyle = darkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';
      map.current.setStyle(currentStyle);
      map.current.once('styledata', () => setMapLoaded(true));
    }
  }, [darkMode]);

  return (
    <>
      <div ref={mapContainer} style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0
      }} />
      <div className="fixed bottom-4 right-4 z-10 bg-bg-primary p-3 rounded shadow-lg">
        {mapLoaded && (
          <div className="text-xs text-text-secondary space-y-1">
            <div>Lng: {info.lng.toFixed(4)}</div>
            <div>Lat: {info.lat.toFixed(4)}</div>
            <div>Zoom: {info.zoom.toFixed(2)}</div>
            <div>Pitch: {info.pitch.toFixed(1)}°</div>
            <div>Bearing: {info.bearing.toFixed(1)}°</div>
          </div>
        )}
      </div>
    </>
  );
}

export default Map;
