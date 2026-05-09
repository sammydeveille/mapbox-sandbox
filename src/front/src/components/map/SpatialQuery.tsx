'use client';

import { useState, useCallback } from 'react';

type QueryMode = 'bbox' | 'radius';

interface SpatialQueryProps {
  onBboxSelect: (bbox: [number, number, number, number]) => void;
  onRadiusSelect: (center: [number, number], radius: number) => void;
}

export function SpatialQuery({ onBboxSelect, onRadiusSelect }: SpatialQueryProps) {
  const [mode, setMode] = useState<QueryMode>('bbox');

  // Bounding box state: [west, south, east, north]
  const [west, setWest] = useState('');
  const [south, setSouth] = useState('');
  const [east, setEast] = useState('');
  const [north, setNorth] = useState('');

  // Radius state
  const [centerLng, setCenterLng] = useState('');
  const [centerLat, setCenterLat] = useState('');
  const [radius, setRadius] = useState('');

  const handleClear = useCallback(() => {
    setWest('');
    setSouth('');
    setEast('');
    setNorth('');
    setCenterLng('');
    setCenterLat('');
    setRadius('');
  }, []);

  const handleQuery = useCallback(() => {
    if (mode === 'bbox') {
      const w = parseFloat(west);
      const s = parseFloat(south);
      const e = parseFloat(east);
      const n = parseFloat(north);

      if ([w, s, e, n].some(isNaN)) return;

      onBboxSelect([w, s, e, n]);
    } else {
      const lng = parseFloat(centerLng);
      const lat = parseFloat(centerLat);
      const r = parseFloat(radius);

      if ([lng, lat, r].some(isNaN)) return;

      onRadiusSelect([lng, lat], r);
    }
  }, [mode, west, south, east, north, centerLng, centerLat, radius, onBboxSelect, onRadiusSelect]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-gray-700">Spatial Query</h3>

      {/* Mode toggle */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('bbox')}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'bbox'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Bounding Box
        </button>
        <button
          type="button"
          onClick={() => setMode('radius')}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'radius'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Radius
        </button>
      </div>

      {/* Bbox inputs */}
      {mode === 'bbox' && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">SW Corner (lng, lat)</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="West (lng)"
                value={west}
                onChange={(e) => setWest(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                step="any"
                min={-180}
                max={180}
              />
              <input
                type="number"
                placeholder="South (lat)"
                value={south}
                onChange={(e) => setSouth(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                step="any"
                min={-90}
                max={90}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">NE Corner (lng, lat)</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="East (lng)"
                value={east}
                onChange={(e) => setEast(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                step="any"
                min={-180}
                max={180}
              />
              <input
                type="number"
                placeholder="North (lat)"
                value={north}
                onChange={(e) => setNorth(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                step="any"
                min={-90}
                max={90}
              />
            </div>
          </div>
        </div>
      )}

      {/* Radius inputs */}
      {mode === 'radius' && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Center Point (lng, lat)</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Longitude"
                value={centerLng}
                onChange={(e) => setCenterLng(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                step="any"
                min={-180}
                max={180}
              />
              <input
                type="number"
                placeholder="Latitude"
                value={centerLat}
                onChange={(e) => setCenterLat(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                step="any"
                min={-90}
                max={90}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Radius (meters)</label>
            <input
              type="number"
              placeholder="Radius in meters"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              step="any"
              min={0}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleQuery}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Query
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
