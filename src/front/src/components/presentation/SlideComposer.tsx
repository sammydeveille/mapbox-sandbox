'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';
import { ViewStateCapture } from './ViewStateCapture';
import { KnowledgeSearchPanel } from '../knowledge/KnowledgeSearchPanel';
import { ItemTypeBadge } from '../knowledge/ItemTypeBadge';
import type { ViewState } from '../../utils/viewStateMapping';

interface SlideItem {
  id: string;
  knowledgeItemId: string;
  position: number;
  title?: string;
  itemType?: string;
}

interface SlideComposerProps {
  slideId: string;
  presentationId: string;
  title: string | null;
  narratorNote: string | null;
  viewState: ViewState | null;
  items: SlideItem[];
}

export function SlideComposer({
  slideId,
  presentationId,
  title,
  narratorNote,
  viewState,
  items,
}: SlideComposerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [localTitle, setLocalTitle] = useState(title ?? '');
  const [localNote, setLocalNote] = useState(narratorNote ?? '');
  const [showSearch, setShowSearch] = useState(false);

  const updateSlideMutation = useMutation(
    trpc.presentation.updateSlide.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.presentation.get.queryKey() });
      },
    })
  );

  const addSlideItemMutation = useMutation(
    trpc.presentation.addSlideItem.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.presentation.get.queryKey() });
      },
    })
  );

  const removeSlideItemMutation = useMutation(
    trpc.presentation.removeSlideItem.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.presentation.get.queryKey() });
      },
    })
  );

  const handleTitleBlur = () => {
    const trimmed = localTitle.trim();
    if (trimmed !== (title ?? '')) {
      updateSlideMutation.mutate({ id: slideId, title: trimmed || undefined });
    }
  };

  const handleNoteBlur = () => {
    if (localNote !== (narratorNote ?? '')) {
      updateSlideMutation.mutate({ id: slideId, narratorNote: localNote || undefined });
    }
  };

  const handleAddItem = (itemId: string) => {
    const nextPosition = items.length > 0
      ? Math.max(...items.map((i) => i.position)) + 1
      : 1;

    addSlideItemMutation.mutate({
      slideId,
      knowledgeItemId: itemId,
      position: nextPosition,
    });
  };

  const handleRemoveItem = (slideItemId: string) => {
    removeSlideItemMutation.mutate({ id: slideItemId });
  };

  return (
    <div className="space-y-4">
      {/* Title field */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
          Slide Title
        </label>
        <input
          type="text"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value.slice(0, 255))}
          onBlur={handleTitleBlur}
          maxLength={255}
          placeholder="Untitled"
          className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <p className="text-[10px] text-text-secondary mt-0.5 text-right">
          {localTitle.length}/255
        </p>
      </div>

      {/* Narrator note field */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
          Narrator Note
        </label>
        <textarea
          value={localNote}
          onChange={(e) => setLocalNote(e.target.value.slice(0, 2000))}
          onBlur={handleNoteBlur}
          maxLength={2000}
          rows={3}
          placeholder="Add notes for the narrator..."
          className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-blue-500 transition-colors resize-y"
        />
        <p className="text-[10px] text-text-secondary mt-0.5 text-right">
          {localNote.length}/2000
        </p>
      </div>

      {/* Update mutation error */}
      {updateSlideMutation.error && (
        <p className="text-xs text-red-400">
          Update failed: {updateSlideMutation.error.message}
        </p>
      )}

      {/* View State Capture */}
      <ViewStateCapture
        slideId={slideId}
        presentationId={presentationId}
        viewState={viewState}
      />

      {/* Knowledge Items section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Knowledge Items
          </h4>
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="text-xs px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
          >
            {showSearch ? 'Hide Search' : '+ Add'}
          </button>
        </div>

        {/* Assigned items list */}
        {items.length === 0 ? (
          <p className="text-xs text-text-secondary italic">
            No knowledge items assigned yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.itemType && <ItemTypeBadge itemType={item.itemType} />}
                  <span className="text-sm text-text-primary truncate">
                    {item.title || 'Untitled Item'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={removeSlideItemMutation.isPending}
                  className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-white/5 hover:bg-red-500/20 text-text-secondary hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Remove item"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add item mutation error */}
        {addSlideItemMutation.error && (
          <p className="text-xs text-red-400">
            Add item failed: {addSlideItemMutation.error.message}
          </p>
        )}

        {/* Remove item mutation error */}
        {removeSlideItemMutation.error && (
          <p className="text-xs text-red-400">
            Remove item failed: {removeSlideItemMutation.error.message}
          </p>
        )}

        {/* Knowledge search panel for adding items */}
        {showSearch && (
          <div className="border border-white/10 rounded-lg overflow-hidden mt-2">
            <KnowledgeSearchPanel
              onSelectItem={handleAddItem}
              slideContext={{
                slideId,
                nextPosition: items.length > 0
                  ? Math.max(...items.map((i) => i.position)) + 1
                  : 1,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
