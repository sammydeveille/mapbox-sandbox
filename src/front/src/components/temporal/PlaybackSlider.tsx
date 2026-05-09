'use client';

import { useEffect, useCallback } from 'react';
import { usePlayback } from './usePlayback';

interface PlaybackSliderProps {
  windowStart: Date;
  windowEnd: Date;
  stepSize?: number;
  timestamps?: Date[]; // sorted data point timestamps for prev/next navigation
  onPositionChange?: (position: Date) => void;
  onReset?: () => void;
}

export function PlaybackSlider({
  windowStart,
  windowEnd,
  stepSize,
  timestamps,
  onPositionChange,
  onReset,
}: PlaybackSliderProps) {
  const { state, play, pause, reset, seek, setSpeed, dispatch } = usePlayback({
    windowStart,
    windowEnd,
    stepSize,
  });

  // Notify parent when position changes during playback only
  useEffect(() => {
    if (state.status === 'playing') {
      onPositionChange?.(state.position);
    }
  }, [state.position, state.status, onPositionChange]);

  const startMs = windowStart.getTime();
  const endMs = windowEnd.getTime();
  const positionMs = state.position.getTime();
  const range = endMs - startMs;

  const sliderValue = range > 0 ? ((positionMs - startMs) / range) * 100 : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = Number(e.target.value);
    const newMs = startMs + (percent / 100) * range;
    seek(new Date(newMs));
    onPositionChange?.(new Date(newMs));
  };

  const handlePrev = useCallback(() => {
    if (timestamps && timestamps.length > 0) {
      // Find the previous data point timestamp before current position
      const currentMs = positionMs;
      let prev: Date | null = null;
      for (let i = timestamps.length - 1; i >= 0; i--) {
        if (timestamps[i].getTime() < currentMs) {
          prev = timestamps[i];
          break;
        }
      }
      if (prev) {
        seek(prev);
        onPositionChange?.(prev);
      }
    } else {
      const newMs = Math.max(startMs, positionMs - state.stepSize);
      seek(new Date(newMs));
      onPositionChange?.(new Date(newMs));
    }
  }, [timestamps, startMs, positionMs, state.stepSize, seek, onPositionChange]);

  const handleNext = useCallback(() => {
    if (timestamps && timestamps.length > 0) {
      // Find the next data point timestamp after current position
      const currentMs = positionMs;
      let next: Date | null = null;
      for (let i = 0; i < timestamps.length; i++) {
        if (timestamps[i].getTime() > currentMs) {
          next = timestamps[i];
          break;
        }
      }
      if (next) {
        seek(next);
        onPositionChange?.(next);
      }
    } else {
      const newMs = Math.min(endMs, positionMs + state.stepSize);
      seek(new Date(newMs));
      onPositionChange?.(new Date(newMs));
    }
  }, [timestamps, endMs, positionMs, state.stepSize, seek, onPositionChange]);

  const formatDate = (date: Date): string => {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex items-center gap-2 flex-1">
      {/* Play/Pause */}
      {state.status === 'playing' ? (
        <button
          onClick={pause}
          className="p-1 text-sm rounded hover:bg-bg-secondary"
          aria-label="Pause"
        >
          ⏸
        </button>
      ) : (
        <button
          onClick={play}
          className="p-1 text-sm rounded hover:bg-bg-secondary"
          aria-label="Play"
        >
          ▶
        </button>
      )}

      {/* Reset */}
      <button
        onClick={() => { reset(); onReset?.(); }}
        className="p-1 text-sm rounded hover:bg-bg-secondary"
        aria-label="Reset"
      >
        ⏹
      </button>

      {/* Prev / Next together */}
      <button
        onClick={handlePrev}
        className="p-1 text-sm rounded hover:bg-bg-secondary"
        aria-label="Previous step"
      >
        ⏮
      </button>
      <button
        onClick={handleNext}
        className="p-1 text-sm rounded hover:bg-bg-secondary"
        aria-label="Next step"
      >
        ⏭
      </button>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={sliderValue}
        onChange={handleSliderChange}
        className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
        aria-label="Playback position"
      />

      {/* Current position label */}
      <span className="text-xs text-text-secondary whitespace-nowrap min-w-[90px] text-center">
        {formatDate(state.position)}
      </span>

      {/* Speed */}
      <select
        value={state.speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
        className="border rounded px-1 py-0.5 text-xs bg-bg-secondary border-gray-300 dark:border-gray-600 text-text-primary"
        aria-label="Playback speed"
      >
        <option value={1}>1x</option>
        <option value={2}>2x</option>
        <option value={4}>4x</option>
        <option value={8}>8x</option>
      </select>
    </div>
  );
}
