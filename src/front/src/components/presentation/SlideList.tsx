'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

interface Slide {
  id: string;
  position: number;
  title: string | null;
  items: unknown[];
}

interface SlideListProps {
  presentationId: string;
  slides: Slide[];
  selectedSlideId: string | null;
  onSelectSlide: (slideId: string) => void;
}

export function SlideList({ presentationId, slides, selectedSlideId, onSelectSlide }: SlideListProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const reorderMutation = useMutation(
    trpc.presentation.reorderSlides.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.presentation.get.queryKey() });
      },
    })
  );

  const removeSlideMutation = useMutation(
    trpc.presentation.removeSlide.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.presentation.get.queryKey() });
      },
    })
  );

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...slides];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderMutation.mutate({
      presentationId,
      slideIds: newOrder.map((s) => s.id),
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === slides.length - 1) return;
    const newOrder = [...slides];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderMutation.mutate({
      presentationId,
      slideIds: newOrder.map((s) => s.id),
    });
  };

  const handleDeleteConfirm = (slideId: string) => {
    removeSlideMutation.mutate(
      { id: slideId },
      { onSettled: () => setDeleteConfirmId(null) }
    );
  };

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
        Slides
      </h4>

      {slides.length === 0 && (
        <p className="text-xs text-text-secondary italic">No slides yet.</p>
      )}

      <ol className="space-y-1">
        {slides.map((slide, index) => {
          const isSelected = slide.id === selectedSlideId;
          const isConfirmingDelete = deleteConfirmId === slide.id;

          return (
            <li
              key={slide.id}
              className={`rounded-lg border transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectSlide(slide.id)}
                className="w-full text-left px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-text-secondary shrink-0">
                      {slide.position}
                    </span>
                    <span className="text-sm text-text-primary truncate">
                      {slide.title || 'Untitled'}
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary shrink-0 ml-2">
                    {slide.items.length} item{slide.items.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>

              {/* Action buttons */}
              <div className="flex items-center gap-1 px-3 pb-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                  disabled={index === 0 || reorderMutation.isPending}
                  className="text-xs px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                  disabled={index === slides.length - 1 || reorderMutation.isPending}
                  className="text-xs px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Move down"
                >
                  ↓
                </button>

                {isConfirmingDelete ? (
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs text-red-400">Delete?</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteConfirm(slide.id); }}
                      disabled={removeSlideMutation.isPending}
                      className="text-xs px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors"
                    >
                      {removeSlideMutation.isPending ? '...' : 'Yes'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                      className="text-xs px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-text-secondary transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(slide.id); }}
                    disabled={removeSlideMutation.isPending}
                    className="text-xs px-1.5 py-0.5 rounded bg-white/5 hover:bg-red-500/20 text-text-secondary hover:text-red-400 ml-auto disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Delete slide"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {reorderMutation.error && (
        <p className="text-xs text-red-400 mt-2">
          Reorder failed: {reorderMutation.error.message}
        </p>
      )}

      {removeSlideMutation.error && (
        <p className="text-xs text-red-400 mt-2">
          Delete failed: {removeSlideMutation.error.message}
        </p>
      )}
    </div>
  );
}
