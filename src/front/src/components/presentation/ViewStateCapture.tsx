'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';
import { useMapShell } from '../MapShell';
import type { ViewState } from '../../utils/viewStateMapping';

interface ViewStateCaptureProps {
  slideId: string;
  presentationId: string;
  viewState: ViewState | null;
}

export function ViewStateCapture({ slideId, presentationId, viewState }: ViewStateCaptureProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { map } = useMapShell();

  const [temporalStart, setTemporalStart] = useState(viewState?.temporalStart ?? '');
  const [temporalEnd, setTemporalEnd] = useState(viewState?.temporalEnd ?? '');

  const updateSlideMutation = useMutation(
    trpc.presentation.updateSlide.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.presentation.get.queryKey() });
      },
    })
  );

  const handleCaptureView = () => {
    if (!map) return;

    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearing = map.getBearing();
    const pitch = map.getPitch();

    const newViewState: ViewState = {
      center: [center.lng, center.lat],
      zoom,
      bearing,
      pitch,
      ...(temporalStart ? { temporalStart } : {}),
      ...(temporalEnd ? { temporalEnd } : {}),
    };

    updateSlideMutation.mutateAsync({
      id: slideId,
      viewState: newViewState,
    });
  };

  const handleTemporalBlur = (field: 'temporalStart' | 'temporalEnd', value: string) => {
    if (!viewState) return;

    const updatedViewState: ViewState = {
      ...viewState,
      [field]: value || undefined,
    };

    // Remove empty temporal fields
    if (!updatedViewState.temporalStart) delete updatedViewState.temporalStart;
    if (!updatedViewState.temporalEnd) delete updatedViewState.temporalEnd;

    updateSlideMutation.mutateAsync({
      id: slideId,
      viewState: updatedViewState,
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
        View State
      </h4>

      {/* Current view state display */}
      {viewState ? (
        <div className="grid grid-cols-2 gap-2 text-xs text-text-primary">
          <div className="rounded bg-white/5 px-2 py-1.5">
            <span className="text-text-secondary">Center: </span>
            <span>{viewState.center[0].toFixed(4)}, {viewState.center[1].toFixed(4)}</span>
          </div>
          <div className="rounded bg-white/5 px-2 py-1.5">
            <span className="text-text-secondary">Zoom: </span>
            <span>{viewState.zoom.toFixed(1)}</span>
          </div>
          <div className="rounded bg-white/5 px-2 py-1.5">
            <span className="text-text-secondary">Bearing: </span>
            <span>{(viewState.bearing ?? 0).toFixed(0)}°</span>
          </div>
          <div className="rounded bg-white/5 px-2 py-1.5">
            <span className="text-text-secondary">Pitch: </span>
            <span>{(viewState.pitch ?? 0).toFixed(0)}°</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-text-secondary italic">
          No view state captured yet.
        </p>
      )}

      {/* Temporal window inputs */}
      {(viewState?.temporalStart || viewState?.temporalEnd || temporalStart || temporalEnd) && (
        <div className="space-y-2">
          <label className="block text-xs text-text-secondary">Temporal Window</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-text-secondary mb-0.5">Start</label>
              <input
                type="datetime-local"
                value={toDatetimeLocalValue(temporalStart)}
                onChange={(e) => setTemporalStart(fromDatetimeLocalValue(e.target.value))}
                onBlur={() => handleTemporalBlur('temporalStart', temporalStart)}
                className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-text-primary focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary mb-0.5">End</label>
              <input
                type="datetime-local"
                value={toDatetimeLocalValue(temporalEnd)}
                onChange={(e) => setTemporalEnd(fromDatetimeLocalValue(e.target.value))}
                onBlur={() => handleTemporalBlur('temporalEnd', temporalEnd)}
                className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-text-primary focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Capture button */}
      <button
        onClick={handleCaptureView}
        disabled={updateSlideMutation.isPending || !map}
        className="w-full text-xs font-medium px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {updateSlideMutation.isPending ? 'Capturing...' : 'Capture Current View'}
      </button>

      {updateSlideMutation.error && (
        <p className="text-xs text-red-400">
          {updateSlideMutation.error.message}
        </p>
      )}
    </div>
  );
}

/**
 * Converts an ISO 8601 datetime string to the format expected by datetime-local inputs (YYYY-MM-DDTHH:mm).
 */
function toDatetimeLocalValue(isoString: string): string {
  if (!isoString) return '';
  // datetime-local expects "YYYY-MM-DDTHH:mm"
  return isoString.slice(0, 16);
}

/**
 * Converts a datetime-local input value back to an ISO 8601 string.
 */
function fromDatetimeLocalValue(localValue: string): string {
  if (!localValue) return '';
  // Append seconds and Z for ISO 8601 format
  return `${localValue}:00Z`;
}
