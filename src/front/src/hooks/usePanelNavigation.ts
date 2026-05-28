'use client';

import { useState, useCallback, useRef } from 'react';

export type PanelState =
  | { view: 'home' }
  | { view: 'search' }
  | { view: 'knowledge-detail'; itemId: string }
  | { view: 'collections' }
  | { view: 'presentation-list'; collectionId: string }
  | { view: 'presentation-editor'; presentationId: string; selectedSlideId?: string }
  | { view: 'presentation-player'; presentationId: string; position: number };

export interface PanelNavigation {
  currentPanel: PanelState;
  navigate: (state: PanelState) => void;
  goBack: () => void;
  canGoBack: boolean;
  saveScrollPosition: (view: string, position: number) => void;
  getScrollPosition: (view: string) => number;
}

export function usePanelNavigation(initialState: PanelState = { view: 'home' }): PanelNavigation {
  const [currentPanel, setCurrentPanel] = useState<PanelState>(initialState);
  const [history, setHistory] = useState<PanelState[]>([]);
  const scrollPositions = useRef<Map<string, number>>(new Map());

  const navigate = useCallback((state: PanelState) => {
    setCurrentPanel((prev) => {
      setHistory((h) => [...h, prev]);
      return state;
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) {
        setCurrentPanel({ view: 'home' });
        return h;
      }
      const newHistory = [...h];
      const previous = newHistory.pop()!;
      setCurrentPanel(previous);
      return newHistory;
    });
  }, []);

  const canGoBack = history.length > 0;

  const saveScrollPosition = useCallback((view: string, position: number) => {
    scrollPositions.current.set(view, position);
  }, []);

  const getScrollPosition = useCallback((view: string): number => {
    return scrollPositions.current.get(view) ?? 0;
  }, []);

  return {
    currentPanel,
    navigate,
    goBack,
    canGoBack,
    saveScrollPosition,
    getScrollPosition,
  };
}
