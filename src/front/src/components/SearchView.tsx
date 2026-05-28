'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

interface SearchViewProps {
  query: string;
  selectedPageId?: number | null;
  pinnedPageIds?: number[];
  geoFirst?: boolean;
  onSelectResult?: (pageId: number, title: string, coordinates?: { lng: number; lat: number; type?: string; dim?: number }) => void;
  onPinResult?: (pageId: number, title: string, coordinates?: { lng: number; lat: number; type?: string; dim?: number }) => void;
}

export function SearchView({ query, selectedPageId, pinnedPageIds = [], geoFirst = true, onSelectResult, onPinResult }: SearchViewProps) {
  const trpc = useTRPC();
  const [showNonGeo, setShowNonGeo] = useState(false);

  const { data: results, isLoading: searchLoading } = useQuery({
    ...trpc.wikipedia.search.queryOptions({ query }),
    enabled: query.length > 0,
  });

  // Split results into geo and non-geo
  const geoResults = results?.filter((r) => r.coordinates) ?? [];
  const nonGeoResults = results?.filter((r) => !r.coordinates) ?? [];

  // If geoFirst is off, or there are no geo results, show all in original order
  const showAllFlat = !geoFirst || geoResults.length === 0;
  const displayResults = showAllFlat ? (results ?? []) : geoResults;

  return (
    <div className="py-1">
      {searchLoading && (
        <p className="text-text-secondary text-xs px-2 py-4 text-center">Searching...</p>
      )}
      {!searchLoading && results?.length === 0 && (
        <p className="text-text-secondary text-xs px-2 py-4 text-center">No results found.</p>
      )}

      {/* Main results */}
      <div className="space-y-0.5">
        {displayResults.map((item) => (
          <ResultRow
            key={item.pageId}
            item={item}
            isSelected={selectedPageId === item.pageId}
            isPinned={pinnedPageIds.includes(item.pageId)}
            onSelect={() => onSelectResult?.(item.pageId, item.title, item.coordinates)}
            onPin={() => onPinResult?.(item.pageId, item.title, item.coordinates)}
          />
        ))}
      </div>

      {/* Non-geo results toggle (only when geoFirst is on, there are geo results, and there are non-geo results) */}
      {geoFirst && geoResults.length > 0 && nonGeoResults.length > 0 && (
        <div className="mt-1">
          <button
            onClick={() => setShowNonGeo(!showNonGeo)}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-text-secondary hover:text-text-primary transition-colors"
          >
            <span>{showNonGeo ? 'Hide' : 'Show'} {nonGeoResults.length} result{nonGeoResults.length > 1 ? 's' : ''} without location</span>
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"
              className={`transition-transform duration-150 ${showNonGeo ? 'rotate-180' : ''}`}
            >
              <path d="M2 4L5 7L8 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {showNonGeo && (
            <div className="space-y-0.5 mt-0.5">
              {nonGeoResults.map((item) => (
                <ResultRow
                  key={item.pageId}
                  item={item}
                  isSelected={selectedPageId === item.pageId}
                  isPinned={pinnedPageIds.includes(item.pageId)}
                  onSelect={() => onSelectResult?.(item.pageId, item.title, item.coordinates)}
                  onPin={() => onPinResult?.(item.pageId, item.title, item.coordinates)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Result Row Component ─────────────────────────────────────────────────────

function ResultRow({
  item,
  isSelected,
  isPinned,
  onSelect,
  onPin,
}: {
  item: { pageId: number; title: string; snippet: string; coordinates?: { lng: number; lat: number } };
  isSelected: boolean;
  isPinned: boolean;
  onSelect: () => void;
  onPin: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-1 px-3 py-2 rounded-lg transition-colors group ${
        isSelected
          ? 'bg-blue-500/15 ring-1 ring-blue-500/30'
          : 'hover:bg-white/5'
      }`}
    >
      <button onClick={onSelect} className="flex-1 text-left min-w-0">
        <p className={`text-sm font-medium transition-colors ${
          isSelected
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400'
        }`}>
          {item.title}
          {item.coordinates && (
            <span className="inline-block ml-1.5 text-[10px] opacity-60 align-middle" title="Has location">📍</span>
          )}
        </p>
        <p className="text-xs text-text-secondary mt-0.5 line-clamp-3">
          {item.snippet}
        </p>
      </button>
      {/* Pin button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isPinned) onPin();
        }}
        className={`shrink-0 mt-0.5 p-1 rounded transition-all ${
          isPinned
            ? 'text-blue-500 opacity-100'
            : 'text-text-secondary opacity-0 group-hover:opacity-100 hover:text-blue-500'
        }`}
        aria-label={isPinned ? 'Pinned' : `Pin ${item.title}`}
        disabled={isPinned}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path d="M9.5 1.5L14.5 6.5L10 11L8.5 14.5L1.5 7.5L5 6L10.5 1.5Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
