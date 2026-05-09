'use client';

import { useReducer, useEffect, useRef, useCallback } from 'react';

export interface PlaybackState {
  status: 'idle' | 'playing' | 'paused';
  position: Date;
  speed: number; // steps per second
  windowStart: Date;
  windowEnd: Date;
  stepSize: number; // milliseconds per step
}

export type PlaybackAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'reset' }
  | { type: 'seek'; position: Date }
  | { type: 'tick' }
  | { type: 'setSpeed'; speed: number }
  | { type: 'setWindow'; windowStart: Date; windowEnd: Date; stepSize: number };

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'play': {
      if (state.status === 'idle' || state.status === 'paused') {
        return { ...state, status: 'playing' };
      }
      return state;
    }
    case 'pause': {
      if (state.status === 'playing') {
        return { ...state, status: 'paused' };
      }
      return state;
    }
    case 'reset': {
      return { ...state, status: 'idle', position: state.windowStart };
    }
    case 'seek': {
      // Clamp position to window bounds
      const clamped = new Date(
        Math.max(
          state.windowStart.getTime(),
          Math.min(state.windowEnd.getTime(), action.position.getTime())
        )
      );
      return { ...state, position: clamped };
    }
    case 'tick': {
      if (state.status !== 'playing') {
        return state;
      }
      const nextTime = state.position.getTime() + state.stepSize;
      if (nextTime >= state.windowEnd.getTime()) {
        return { ...state, status: 'idle', position: state.windowEnd };
      }
      return { ...state, position: new Date(nextTime) };
    }
    case 'setSpeed': {
      return { ...state, speed: action.speed };
    }
    case 'setWindow': {
      return {
        ...state,
        status: 'idle' as const,
        windowStart: action.windowStart,
        windowEnd: action.windowEnd,
        stepSize: action.stepSize,
        position: action.windowStart,
      };
    }
    default:
      return state;
  }
}

export interface UsePlaybackOptions {
  windowStart: Date;
  windowEnd: Date;
  stepSize?: number; // milliseconds per step, defaults to 1 hour
  initialSpeed?: number; // steps per second, defaults to 1
}

export function usePlayback(options: UsePlaybackOptions) {
  const { windowStart, windowEnd, stepSize: customStepSize, initialSpeed = 1 } = options;

  // Auto-calculate step size: divide the window into ~100 steps if not provided
  const stepSize = customStepSize ?? Math.max(
    1000,
    Math.floor((windowEnd.getTime() - windowStart.getTime()) / 100)
  );

  const [state, dispatch] = useReducer(playbackReducer, {
    status: 'idle',
    position: windowStart,
    speed: initialSpeed,
    windowStart,
    windowEnd,
    stepSize,
  });

  // Sync state when window bounds change
  const prevStartRef = useRef(windowStart.getTime());
  const prevEndRef = useRef(windowEnd.getTime());
  useEffect(() => {
    const startChanged = windowStart.getTime() !== prevStartRef.current;
    const endChanged = windowEnd.getTime() !== prevEndRef.current;
    if (startChanged || endChanged) {
      prevStartRef.current = windowStart.getTime();
      prevEndRef.current = windowEnd.getTime();
      dispatch({ type: 'setWindow', windowStart, windowEnd, stepSize });
    }
  }, [windowStart, windowEnd, stepSize]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear and set interval based on playback status
  useEffect(() => {
    if (state.status === 'playing') {
      const intervalMs = 1000 / state.speed;
      intervalRef.current = setInterval(() => {
        dispatch({ type: 'tick' });
      }, intervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.status, state.speed]);

  const play = useCallback(() => dispatch({ type: 'play' }), []);
  const pause = useCallback(() => dispatch({ type: 'pause' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  const seek = useCallback((position: Date) => dispatch({ type: 'seek', position }), []);
  const setSpeed = useCallback((speed: number) => dispatch({ type: 'setSpeed', speed }), []);

  return {
    state,
    play,
    pause,
    reset,
    seek,
    setSpeed,
    dispatch,
  };
}
