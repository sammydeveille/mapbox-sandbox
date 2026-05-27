'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

interface SearchDetailViewProps {
  pageId: number;
}

export function SearchDetailView({ pageId }: SearchDetailViewProps) {
  const trpc = useTRPC();

  const { data: pageContent, isLoading } = useQuery({
    ...trpc.wikipedia.getPage.queryOptions({ pageId }),
    enabled: pageId > 0,
  });

  if (isLoading) {
    return (
      <div className="p-3 space-y-3 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-3/4" />
        <div className="h-32 bg-white/10 rounded w-full" />
        <div className="h-4 bg-white/10 rounded w-full" />
        <div className="h-4 bg-white/10 rounded w-5/6" />
      </div>
    );
  }

  if (!pageContent) return null;

  return (
    <article className="p-3">
      <h1 className="text-base font-bold text-text-primary mb-2">
        {pageContent.title}
      </h1>
      {pageContent.thumbnail && (
        <img
          src={pageContent.thumbnail}
          alt={pageContent.title}
          className="w-full rounded-lg mb-3 object-cover max-h-40"
        />
      )}
      <div className="text-xs text-text-primary leading-relaxed whitespace-pre-line">
        {pageContent.extract}
      </div>
      <a
        href={pageContent.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-3 text-xs text-blue-500 hover:text-blue-600 hover:underline"
      >
        Read on Wikipedia →
      </a>
    </article>
  );
}
