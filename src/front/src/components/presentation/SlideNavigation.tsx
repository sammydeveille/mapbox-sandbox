'use client';

interface SlideNavigationProps {
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function SlideNavigation({ position, total, onPrev, onNext }: SlideNavigationProps) {
  const isFirst = position === 1;
  const isLast = position === total;

  return (
    <div className="flex items-center justify-between gap-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={isFirst}
        aria-label="Previous slide"
        className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-text-primary hover:bg-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ‹
      </button>
      <span className="text-[9px] text-text-secondary whitespace-nowrap">
        Slide {position} of {total}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={isLast}
        aria-label="Next slide"
        className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-text-primary hover:bg-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>
  );
}
