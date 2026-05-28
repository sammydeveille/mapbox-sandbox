'use client';

import { useCallback, useMemo, useState } from 'react';

interface UsePresentationPlaybackResult {
  position: number;
  isFirst: boolean;
  isLast: boolean;
  slideLabel: string;
  next: () => void;
  prev: () => void;
  goTo: (pos: number) => void;
}

export function usePresentationPlayback(totalSlides: number): UsePresentationPlaybackResult {
  const [position, setPosition] = useState(1);

  const next = useCallback(() => {
    setPosition((prev) => (prev < totalSlides ? prev + 1 : prev));
  }, [totalSlides]);

  const prev = useCallback(() => {
    setPosition((prev) => (prev > 1 ? prev - 1 : prev));
  }, []);

  const goTo = useCallback(
    (pos: number) => {
      setPosition(Math.max(1, Math.min(pos, totalSlides)));
    },
    [totalSlides]
  );

  const isFirst = position === 1;
  const isLast = position === totalSlides;
  const slideLabel = `Slide ${position} of ${totalSlides}`;

  return useMemo(
    () => ({ position, isFirst, isLast, slideLabel, next, prev, goTo }),
    [position, isFirst, isLast, slideLabel, next, prev, goTo]
  );
}
