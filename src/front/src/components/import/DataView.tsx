'use client';

import { useMemo } from 'react';

interface DataPoint {
  id: string;
  geometry: unknown;
  timestamp: string;
  value: number;
  metadata?: Record<string, unknown> | null;
}

interface DataViewProps {
  dataPoints: DataPoint[];
  layerName?: string;
  renderType?: string;
  currentTime?: string | null;
  onPointClick?: (point: DataPoint) => void;
}

export function DataView({ dataPoints, layerName, renderType, currentTime, onPointClick }: DataViewProps) {
  const sorted = useMemo(
    () => [...dataPoints].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [dataPoints]
  );

  const stats = useMemo(() => {
    if (dataPoints.length === 0) return null;
    const values = dataPoints.map((d) => d.value);
    return {
      count: dataPoints.length,
      min: Math.min(...values).toFixed(2),
      max: Math.max(...values).toFixed(2),
      avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
      earliest: new Date(Math.min(...dataPoints.map((d) => new Date(d.timestamp).getTime()))).toLocaleDateString(),
      latest: new Date(Math.max(...dataPoints.map((d) => new Date(d.timestamp).getTime()))).toLocaleDateString(),
    };
  }, [dataPoints]);

  // Find the highlighted row (last point with timestamp <= currentTime)
  const highlightedId = useMemo(() => {
    if (!currentTime || sorted.length === 0) return null;
    const cutoff = new Date(currentTime).getTime();
    let lastMatch: string | null = null;
    for (const dp of sorted) {
      if (new Date(dp.timestamp).getTime() <= cutoff) {
        lastMatch = dp.id;
      } else {
        break;
      }
    }
    return lastMatch;
  }, [currentTime, sorted]);

  if (dataPoints.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">No data points loaded.</p>
        <p className="text-xs mt-1">Select a layer or adjust the time range.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            {layerName && <h3 className="font-medium text-sm">{layerName}</h3>}
            {renderType && (
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded mt-1 inline-block">
                {renderType}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">{stats?.count} points</span>
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 p-4 border-b border-gray-200 dark:border-gray-700 text-xs">
          <div className="text-center">
            <div className="text-gray-500">Min</div>
            <div className="font-medium">{stats.min}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Avg</div>
            <div className="font-medium">{stats.avg}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Max</div>
            <div className="font-medium">{stats.max}</div>
          </div>
          <div className="text-center col-span-3 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <span className="text-gray-500">{stats.earliest}</span>
            <span className="mx-2 text-gray-400">→</span>
            <span className="text-gray-500">{stats.latest}</span>
          </div>
        </div>
      )}

      {/* Data table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-bg-primary border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-400">Time</th>
              <th className="text-right p-2 font-medium text-gray-600 dark:text-gray-400">Value</th>
              <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-400">Details</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((dp) => (
              <tr
                key={dp.id}
                onClick={() => onPointClick?.(dp)}
                className={`border-b border-gray-50 dark:border-gray-800 cursor-pointer ${
                  dp.id === highlightedId
                    ? 'bg-blue-50 dark:bg-blue-900/30 font-medium'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <td className="p-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {formatTimestamp(dp.timestamp)}
                </td>
                <td className="p-2 text-right font-mono text-gray-900 dark:text-gray-100">
                  {dp.value.toFixed(1)}
                </td>
                <td className="p-2 text-gray-500 truncate max-w-[120px]">
                  {formatMetadata(dp.metadata)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMetadata(meta: Record<string, unknown> | null | undefined): string {
  if (!meta) return '—';
  const entries = Object.entries(meta);
  if (entries.length === 0) return '—';
  // Show first key-value pair
  const [key, val] = entries[0];
  const suffix = entries.length > 1 ? ` +${entries.length - 1}` : '';
  return `${key}: ${String(val)}${suffix}`;
}
