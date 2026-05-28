'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';
import { useMapShell } from '../MapShell';
import { usePresentationPlayback } from '@/hooks/usePresentationPlayback';
import { mapViewStateToFlyTo, type ViewState } from '@/utils/viewStateMapping';
import { SlideNavigation } from './SlideNavigation';

interface PresentationPlayerProps {
  presentationId: string;
  totalSlides: number;
  onBackToEditor: () => void;
  /** Called when the current slide position changes, providing the position for parent-level overlay queries */
  onSlideChange?: (position: number) => void;
}

interface KnowledgeItemDetail {
  id: string;
  title: string | null;
  summary: string | null;
  content: string | null;
  itemType: string | null;
  slideItemId: string;
  annotation: string | null;
  position: number;
  times: Array<{
    id: string;
    start_time: string;
    end_time: string | null;
    precision: string;
  }>;
  places: Array<{
    id: string;
    geometry: GeoJSON.Geometry;
    place_name: string | null;
    precision: string;
  }>;
}

export function PresentationPlayer({ presentationId, totalSlides, onBackToEditor, onSlideChange }: PresentationPlayerProps) {
  const trpc = useTRPC();
  const { flyTo } = useMapShell();
  const { position, isFirst, isLast, next, prev } = usePresentationPlayback(totalSlides);

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [navigationError, setNavigationError] = useState<string | null>(null);

  // Notify parent of position changes for map overlay synchronization
  useEffect(() => {
    onSlideChange?.(position);
  }, [position, onSlideChange]);

  // Fetch slide data via presentation.navigate
  const { data, error, isLoading } = useQuery(
    trpc.presentation.navigate.queryOptions({
      presentationId,
      position,
    })
  );

  // Fly to the slide's view state when navigation data is received
  useEffect(() => {
    if (!data?.slide?.viewState) return;

    try {
      const viewState = data.slide.viewState as ViewState;
      const flyToParams = mapViewStateToFlyTo(viewState);
      flyTo(flyToParams.center[0], flyToParams.center[1], flyToParams.zoom);
    } catch {
      // Map operation failed - non-critical, don't block UI
    }
  }, [data?.slide?.viewState, flyTo]);

  // Clear navigation error when position changes successfully
  useEffect(() => {
    if (data && !error) {
      setNavigationError(null);
    }
  }, [data, error]);

  // Handle navigation error (retain current slide, show error)
  useEffect(() => {
    if (error) {
      setNavigationError(`Navigation failed: ${error.message}`);
    }
  }, [error]);

  const handlePrev = () => {
    setNavigationError(null);
    prev();
  };

  const handleNext = () => {
    setNavigationError(null);
    next();
  };

  const handleItemClick = (itemId: string) => {
    setExpandedItemId(expandedItemId === itemId ? null : itemId);
  };

  const items = (data?.items ?? []) as unknown as KnowledgeItemDetail[];
  const slide = data?.slide;

  return (
    <div className="flex flex-col h-full w-[120px] max-w-[120px]">
      {/* Back to Editor button */}
      <div className="px-2 pt-2 pb-1 flex-shrink-0">
        <button
          type="button"
          onClick={onBackToEditor}
          className="text-[10px] text-text-secondary hover:text-text-primary transition-colors"
        >
          ← Editor
        </button>
      </div>

      {/* Navigation error banner */}
      {navigationError && (
        <div className="px-2 pb-1">
          <p className="text-[9px] text-red-400 leading-tight">
            {navigationError}
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !data && (
        <div className="flex-1 flex items-center justify-center px-2">
          <div className="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Slide content */}
      {slide && (
        <div className="flex-1 overflow-y-auto min-h-0 px-2 space-y-1.5">
          {/* Slide title */}
          {slide.title && (
            <h3 className="text-[10px] font-semibold text-text-primary leading-tight truncate">
              {slide.title}
            </h3>
          )}

          {/* Narrator note */}
          {slide.narratorNote && (
            <p className="text-[9px] text-text-secondary leading-tight line-clamp-3">
              {slide.narratorNote}
            </p>
          )}

          {/* Knowledge items */}
          {items.length > 0 && (
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.slideItemId} className="rounded bg-white/5">
                  <button
                    type="button"
                    onClick={() => handleItemClick(item.slideItemId)}
                    className="w-full text-left px-1.5 py-1 text-[9px] text-text-primary hover:bg-white/5 transition-colors leading-tight"
                  >
                    <span className="truncate block">
                      {item.title ?? 'Untitled'}
                    </span>
                  </button>

                  {/* Expanded detail */}
                  {expandedItemId === item.slideItemId && (
                    <div className="px-1.5 pb-1.5 space-y-1 border-t border-white/5">
                      {/* Full content */}
                      {item.content && (
                        <p className="text-[8px] text-text-secondary leading-tight mt-1">
                          {item.content}
                        </p>
                      )}

                      {/* Temporal bindings */}
                      {item.times.length > 0 && (
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-medium text-text-secondary">Time:</span>
                          {item.times.map((t) => (
                            <p key={t.id} className="text-[8px] text-text-secondary">
                              {t.start_time}{t.end_time ? ` – ${t.end_time}` : ''}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Spatial bindings */}
                      {item.places.length > 0 && (
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-medium text-text-secondary">Place:</span>
                          {item.places.map((p) => (
                            <p key={p.id} className="text-[8px] text-text-secondary">
                              {p.place_name ?? p.geometry?.type ?? 'Unknown'}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slide navigation at bottom */}
      <div className="flex-shrink-0 px-1 py-1.5 border-t border-white/10">
        <SlideNavigation
          position={position}
          total={totalSlides}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </div>
    </div>
  );
}
