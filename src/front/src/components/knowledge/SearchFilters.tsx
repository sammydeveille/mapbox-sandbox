'use client';

import { useMapShell } from '../MapShell';

interface SearchFiltersProps {
  text: string;
  spatialEnabled: boolean;
  timeStart: string | null;
  timeEnd: string | null;
  onTextChange: (value: string) => void;
  onSpatialToggle: (bounds: [number, number, number, number] | null) => void;
  onTimeStartChange: (value: string | null) => void;
  onTimeEndChange: (value: string | null) => void;
}

export function SearchFilters({
  text,
  spatialEnabled,
  timeStart,
  timeEnd,
  onTextChange,
  onSpatialToggle,
  onTimeStartChange,
  onTimeEndChange,
}: SearchFiltersProps) {
  const { map } = useMapShell();

  const handleSpatialToggle = () => {
    if (spatialEnabled) {
      onSpatialToggle(null);
    } else {
      if (map) {
        const bounds = map.getBounds();
        if (bounds) {
          const bbox: [number, number, number, number] = [
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth(),
          ];
          onSpatialToggle(bbox);
        }
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Text search */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary">Text Search</label>
        <input
          type="text"
          maxLength={500}
          placeholder="Search knowledge items..."
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-bg-secondary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Spatial filter toggle */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary">Spatial Filter</label>
        <button
          type="button"
          onClick={handleSpatialToggle}
          className={`w-full rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            spatialEnabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-bg-secondary text-text-primary border border-white/10 hover:bg-white/5'
          }`}
        >
          {spatialEnabled ? '📍 Using Map Bounds' : '📍 Use Current Map Bounds'}
        </button>
      </div>

      {/* Temporal filter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary">Temporal Filter</label>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-text-secondary">Start</label>
            <input
              type="datetime-local"
              value={timeStart ?? ''}
              onChange={(e) => onTimeStartChange(e.target.value || null)}
              className="w-full rounded-md border border-white/10 bg-bg-secondary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-text-secondary">End</label>
            <input
              type="datetime-local"
              value={timeEnd ?? ''}
              onChange={(e) => onTimeEndChange(e.target.value || null)}
              className="w-full rounded-md border border-white/10 bg-bg-secondary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
