'use client';

import { useEffect, useCallback } from 'react';
import { usePlayback } from './usePlayback';

interface PlaybackSliderProps {
  windowStart: Date;
  windowEnd: Date;
  stepSize?: number;
  timestamps?: Date[];
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
  const { state, play, pause, reset, seek, setSpeed } = usePlayback({
    windowStart,
    windowEnd,
    stepSize,
  });

  useEffect(() => {
    if (state.status === 'playing') {
      onPositionChange?.(state.position);
    }
  }, [state.position, state.status, onPositionChange]);

  const startMs = windowStart.getTime();
  const endMs = windowEnd.getTime();
  const positionMs = state.position.getTime();
  const range = endMs - startMs;

  const progress = range > 0 ? ((positionMs - startMs) / range) * 100 : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = Number(e.target.value);
    const newMs = startMs + (percent / 100) * range;
    seek(new Date(newMs));
    onPositionChange?.(new Date(newMs));
  };

  const handlePrev = useCallback(() => {
    if (timestamps && timestamps.length > 0) {
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

  const formatShortDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPosition = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="flex items-center w-full gap-4">
      {/* Left: Transport controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => { reset(); onReset?.(); }}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-text-primary transition-colors"
          aria-label="Reset"
          title="Reset"
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 2v8l3-2.5V10l5-4-5-4v2.5L2 2z" transform="scale(-1,1) translate(-12,0)" />
          </svg>
        </button>
        <button
          onClick={handlePrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-text-primary transition-colors"
          aria-label="Previous"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>
        {state.status === 'playing' ? (
          <button
            onClick={pause}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-text-primary transition-colors"
            aria-label="Pause"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={play}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-text-primary transition-colors"
            aria-label="Play"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
        <button
          onClick={handleNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-text-primary transition-colors"
          aria-label="Next"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      {/* Center: Time + Progress bar */}
      <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
        {/* Time labels */}
        <div className="flex items-center justify-between w-full px-0.5">
          <span className="text-xs text-text-secondary font-mono tabular-nums">
            {formatPosition(state.position)}
          </span>
          <span className="text-xs text-text-secondary font-mono tabular-nums">
            {formatShortDate(windowEnd)}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full relative h-[6px] group">
          <div className="absolute inset-0 rounded-full bg-gray-300/40 dark:bg-gray-600/40" />
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-text-primary/80 transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Playback position"
          />
        </div>
      </div>

      {/* Right: Speed */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <select
          value={state.speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="appearance-none bg-transparent text-xs text-text-secondary font-medium px-2 py-1 rounded hover:bg-white/10 cursor-pointer transition-colors"
          aria-label="Playback speed"
        >
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={4}>4×</option>
          <option value={8}>8×</option>
        </select>
      </div>
    </div>
  );
}
