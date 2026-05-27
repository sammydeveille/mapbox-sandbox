'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

interface SearchViewProps {
  query: string;
  selectedPageId?: number | null;
  onSelectResult?: (pageId: number, title: string) => void;
}

export function SearchView({ query, selectedPageId, onSelectResult }: SearchViewProps) {
  const trpc = useTRPC();

  const { data: results, isLoading: searchLoading } = useQuery({
    ...trpc.wikipedia.search.queryOptions({ query }),
    enabled: query.length > 0,
  });

  return (
    <div className="py-1">
      {searchLoading && (
        <p className="text-text-secondary text-xs px-2 py-4 text-center">Searching...</p>
      )}
      {!searchLoading && results?.length === 0 && (
        <p className="text-text-secondary text-xs px-2 py-4 text-center">No results found.</p>
      )}
      <div className="space-y-0.5">
        {results?.map((item) => (
          <button
            key={item.pageId}
            onClick={() => onSelectResult?.(item.pageId, item.title)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors group ${
              selectedPageId === item.pageId
                ? 'bg-blue-500/15 ring-1 ring-blue-500/30'
                : 'hover:bg-white/5'
            }`}
          >
            <p className={`text-sm font-medium transition-colors ${
              selectedPageId === item.pageId
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400'
            }`}>
              {item.title}
            </p>
            <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
              {item.snippet}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
