'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';
import { useMapShell } from '../MapShell';
import { SlideList } from './SlideList';
import { SlideComposer } from './SlideComposer';
import type { ViewState } from '../../utils/viewStateMapping';

interface PresentationEditorProps {
  presentationId: string;
  onPlay: (presentationId: string) => void;
  onBack: () => void;
}

export function PresentationEditor({ presentationId, onPlay, onBack }: PresentationEditorProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { map } = useMapShell();

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);

  // Fetch presentation with slides
  const { data: presentation, isLoading, error, refetch } = useQuery(
    trpc.presentation.get.queryOptions({ id: presentationId })
  );

  // Add slide mutation
  const addSlideMutation = useMutation(
    trpc.presentation.addSlide.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.presentation.get.queryKey() });
      },
    })
  );

  // Default to first slide if available and no slide is selected
  const slides = presentation?.slides ?? [];
  const effectiveSelectedSlideId =
    selectedSlideId && slides.some((s) => s.id === selectedSlideId)
      ? selectedSlideId
      : slides[0]?.id ?? null;

  const selectedSlide = slides.find((s) => s.id === effectiveSelectedSlideId) ?? null;

  const handleAddSlide = () => {
    if (!map) return;

    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearing = map.getBearing();
    const pitch = map.getPitch();

    const viewState: ViewState = {
      center: [center.lng, center.lat],
      zoom,
      bearing,
      pitch,
    };

    const maxPosition = slides.length > 0
      ? Math.max(...slides.map((s) => s.position))
      : 0;

    addSlideMutation.mutate({
      presentationId,
      position: maxPosition + 1,
      viewState,
    });
  };

  const handlePlay = () => {
    onPlay(presentationId);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-3 h-full">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="space-y-2 flex-1">
          <div className="h-12 rounded bg-white/5 animate-pulse" />
          <div className="h-12 rounded bg-white/5 animate-pulse" />
          <div className="h-12 rounded bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col gap-3 p-3 h-full">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors self-start"
        >
          ← Back
        </button>
        <div className="text-center py-4">
          <p className="text-xs text-red-400 mb-2">
            Failed to load presentation: {error.message}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs px-3 py-1 rounded bg-white/10 text-text-primary hover:bg-white/15 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors shrink-0"
          >
            ← Back
          </button>
          <h2 className="text-sm font-semibold text-text-primary truncate">
            {presentation?.title}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePlay}
            disabled={slides.length === 0}
            className="text-xs px-2.5 py-1 rounded-md bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▶ Play
          </button>
        </div>
      </div>

      {/* Slide list section */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Slides
          </span>
          <button
            type="button"
            onClick={handleAddSlide}
            disabled={addSlideMutation.isPending || !map}
            className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addSlideMutation.isPending ? 'Adding...' : '+ Add Slide'}
          </button>
        </div>

        {addSlideMutation.error && (
          <p className="text-xs text-red-400 mb-2">
            Failed to add slide: {addSlideMutation.error.message}
          </p>
        )}

        <SlideList
          presentationId={presentationId}
          slides={slides}
          selectedSlideId={effectiveSelectedSlideId}
          onSelectSlide={setSelectedSlideId}
        />
      </div>

      {/* Slide composer section */}
      {selectedSlide && (
        <div className="flex-1 overflow-y-auto min-h-0 border-t border-white/10 px-3 pt-3">
          <SlideComposer
            slideId={selectedSlide.id}
            presentationId={presentationId}
            title={selectedSlide.title}
            narratorNote={selectedSlide.narratorNote}
            viewState={selectedSlide.viewState as ViewState | null}
            items={selectedSlide.items}
          />
        </div>
      )}

      {/* Empty state when no slides */}
      {!selectedSlide && slides.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-3">
          <div className="text-center">
            <p className="text-xs text-text-secondary">
              No slides yet. Click "Add Slide" to capture the current map view.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
