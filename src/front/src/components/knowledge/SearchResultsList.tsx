'use client';

import { computePagination } from '../../utils/paginationHelpers';
import { ItemTypeBadge } from './ItemTypeBadge';

interface SearchResult {
  id: string;
  title: string;
  summary: string;
  itemType: string;
}

interface SearchResultsListProps {
  results: SearchResult[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  onSelectItem: (id: string) => void;
}

export function SearchResultsList({
  results,
  total,
  page,
  onPageChange,
  onSelectItem,
}: SearchResultsListProps) {
  if (results.length === 0) {
    return (
      <p className="text-text-secondary text-xs px-2 py-4 text-center">
        No results found.
      </p>
    );
  }

  const { totalPages, hasNext, hasPrevious, displayPage } = computePagination(total, page);

  return (
    <div>
      <div className="divide-y divide-white/10">
        {results.map((result) => (
          <button
            key={result.id}
            onClick={() => onSelectItem(result.id)}
            className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                {result.title}
              </p>
              <ItemTypeBadge itemType={result.itemType} />
            </div>
            <p className="text-xs text-text-secondary line-clamp-2">
              {result.summary}
            </p>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/10">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrevious}
            className="text-xs px-2 py-1 rounded text-text-primary hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-xs text-text-secondary">
            Page {displayPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="text-xs px-2 py-1 rounded text-text-primary hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
