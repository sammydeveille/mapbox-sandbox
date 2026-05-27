'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { SearchFilters } from './SearchFilters';
import { SearchResultsList } from './SearchResultsList';

interface KnowledgeSearchPanelProps {
  onSelectItem: (itemId: string) => void;
  slideContext?: { slideId: string; nextPosition: number };
  /** Called when the spatial filter bbox changes (null when deactivated) */
  onSpatialFilterChange?: (bbox: [number, number, number, number] | null) => void;
}

export function KnowledgeSearchPanel({
  onSelectItem,
  slideContext,
  onSpatialFilterChange,
}: KnowledgeSearchPanelProps) {
  const trpc = useTRPC();
  const {
    filters,
    searchParams,
    isDisabled,
    setText,
    setSpatialEnabled,
    setBbox,
    setTimeStart,
    setTimeEnd,
    setPage,
  } = useSearchFilters();

  // Track whether the user has submitted a search
  const [submitted, setSubmitted] = useState(false);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    ...trpc.search.query.queryOptions(searchParams),
    enabled: submitted && !isDisabled,
  });

  const handleSubmit = () => {
    if (isDisabled) return;
    setSubmitted(true);
  };

  const handleSpatialToggle = (bounds: [number, number, number, number] | null) => {
    if (bounds) {
      setSpatialEnabled(true);
      setBbox(bounds);
    } else {
      setSpatialEnabled(false);
      setBbox(null);
    }
    // Notify parent of spatial filter change
    onSpatialFilterChange?.(bounds);
    // Reset pagination on filter change
    setPage(0);
    setSubmitted(false);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    setPage(0);
    setSubmitted(false);
  };

  const handleTimeStartChange = (value: string | null) => {
    setTimeStart(value);
    setPage(0);
    setSubmitted(false);
  };

  const handleTimeEndChange = (value: string | null) => {
    setTimeEnd(value);
    setPage(0);
    setSubmitted(false);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Re-fetch with new page automatically since submitted is already true
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="px-3 pt-3">
        <h2 className="text-sm font-semibold text-text-primary">Knowledge Search</h2>
        {slideContext && (
          <p className="text-[10px] text-text-secondary mt-0.5">
            Adding to slide — select an item to add
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="px-3">
        <SearchFilters
          text={filters.text}
          spatialEnabled={filters.spatialEnabled}
          timeStart={filters.timeStart}
          timeEnd={filters.timeEnd}
          onTextChange={handleTextChange}
          onSpatialToggle={handleSpatialToggle}
          onTimeStartChange={handleTimeStartChange}
          onTimeEndChange={handleTimeEndChange}
        />
      </div>

      {/* Search button */}
      <div className="px-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled}
          className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Search
        </button>
        {isDisabled && (
          <p className="text-[10px] text-text-secondary mt-1 text-center">
            At least one filter is required
          </p>
        )}
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Loading state */}
        {isLoading && submitted && (
          <div className="px-3 py-4 space-y-2">
            <div className="h-10 rounded bg-white/5 animate-pulse" />
            <div className="h-10 rounded bg-white/5 animate-pulse" />
            <div className="h-10 rounded bg-white/5 animate-pulse" />
            <div className="h-10 rounded bg-white/5 animate-pulse" />
            <div className="h-10 rounded bg-white/5 animate-pulse" />
          </div>
        )}

        {/* Error state */}
        {error && submitted && (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-red-400 mb-2">
              Search could not be completed: {error.message}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs px-3 py-1 rounded bg-white/10 text-text-primary hover:bg-white/15 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Results */}
        {data && !isLoading && !error && submitted && (
          <SearchResultsList
            results={data.results.map((r) => ({
              id: r.id,
              title: r.title,
              summary: r.summary,
              itemType: r.itemType,
            }))}
            total={data.total}
            page={data.page}
            onPageChange={handlePageChange}
            onSelectItem={onSelectItem}
          />
        )}
      </div>
    </div>
  );
}
