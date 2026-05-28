'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';
import { CollectionForm } from './CollectionForm';

interface CollectionListProps {
  profileId: string;
  onSelect: (collectionId: string) => void;
  selectedId?: string | null;
}

export function CollectionList({ profileId, onSelect, selectedId }: CollectionListProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  const { data: collections, isLoading } = useQuery(
    trpc.collection.list.queryOptions({ ownerId: profileId })
  );

  const deleteMutation = useMutation(
    trpc.collection.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.collection.list.queryKey() });
        setContextMenuId(null);
      },
    })
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id, ownerId: profileId });
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  if (showForm) {
    return (
      <CollectionForm
        profileId={profileId}
        onSuccess={() => setShowForm(false)}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="select-none">
      {/* Section header — collapsible */}
      <div className="flex items-center justify-between px-2 mb-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="currentColor"
            className={`transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
          >
            <path d="M3 1.5L7 5L3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Collections
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="text-text-secondary hover:text-text-primary text-lg leading-none transition-colors px-1"
          aria-label="New collection"
          title="New collection"
        >
          +
        </button>
      </div>

      {/* Collection items */}
      {expanded && (
        <div className="space-y-0.5">
          {isLoading && (
            <p className="text-text-secondary text-xs px-2 py-1">Loading...</p>
          )}
          {!isLoading && collections?.length === 0 && (
            <p className="text-text-secondary text-xs px-2 py-1">No collections yet.</p>
          )}
          {collections?.map((item) => (
            <div key={item.id} className="relative group">
              <button
                onClick={() => onSelect(item.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenuId(contextMenuId === item.id ? null : item.id);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors text-left ${
                  selectedId === item.id
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-text-primary hover:bg-white/5 dark:hover:bg-white/5'
                }`}
              >
                <span className="text-base opacity-70">📁</span>
                <span className="truncate flex-1">{item.name}</span>
              </button>

              {/* Context menu (right-click or long-press) */}
              {contextMenuId === item.id && (
                <div className="absolute left-8 top-8 z-50 bg-bg-primary border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]">
                  <button
                    onClick={() => {
                      handleDelete(item.id);
                    }}
                    disabled={deleteMutation.isPending}
                    className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setContextMenuId(null)}
                    className="w-full text-left px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
