'use client';

import { useEffect, useRef, useState } from 'react';
import { formatTemporalRange, type TemporalPrecision } from '@/utils/formatTemporal';

interface TemporalContextBarProps {
  /** ISO 8601 start timestamp of the temporal window */
  temporalStart?: string | null;
  /** ISO 8601 end timestamp of the temporal window */
  temporalEnd?: string | null;
  /** Precision level for formatting the temporal range */
  precision?: TemporalPrecision;
}

/**
 * Displays the active temporal range as an overlay at the top-center of the map.
 *
 * - Formats the range using `formatTemporalRange` based on precision
 * - Animates text transitions between different time ranges (max 500ms)
 * - Hides when no temporal window is defined
 * - Positioned as an absolute overlay that does not obscure map controls
 */
export function TemporalContextBar({
  temporalStart,
  temporalEnd,
  precision = 'day',
}: TemporalContextBarProps) {
  const [displayText, setDisplayText] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevTextRef = useRef<string>('');

  useEffect(() => {
    if (!temporalStart || !temporalEnd) {
      // Hide the bar when no temporal window is defined
      setIsVisible(false);
      return;
    }

    const newText = formatTemporalRange(temporalStart, temporalEnd, precision);

    if (newText === prevTextRef.current) {
      // No change, ensure visible
      setIsVisible(true);
      return;
    }

    if (prevTextRef.current === '') {
      // First appearance — show without transition
      setDisplayText(newText);
      setIsVisible(true);
      prevTextRef.current = newText;
      return;
    }

    // Animate text transition: fade out, swap text, fade in
    setIsTransitioning(true);

    const timeout = setTimeout(() => {
      setDisplayText(newText);
      setIsTransitioning(false);
      prevTextRef.current = newText;
    }, 250); // Half of 500ms budget for fade-out, other half for fade-in

    return () => clearTimeout(timeout);
  }, [temporalStart, temporalEnd, precision]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
      role="status"
      aria-live="polite"
      aria-label="Temporal context"
    >
      <div
        className={[
          'px-4 py-2 rounded-full',
          'bg-black/70 backdrop-blur-sm',
          'text-sm font-medium text-white',
          'shadow-lg',
          'transition-opacity duration-[250ms] ease-in-out',
          isTransitioning ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
      >
        {displayText}
      </div>
    </div>
  );
}
