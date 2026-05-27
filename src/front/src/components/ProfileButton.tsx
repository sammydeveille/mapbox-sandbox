'use client';

import { useState, useRef, useEffect } from 'react';

interface ProfileButtonProps {
  profileId: string | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  projection: 'globe' | 'mercator';
  onToggleProjection: () => void;
  mapInfo: { zoom: number; pitch: number; bearing: number };
}

export function ProfileButton({ profileId, darkMode, onToggleDarkMode, projection, onToggleProjection, mapInfo }: ProfileButtonProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const initials = profileId ? profileId.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold shadow-lg ring-2 ring-white/20 hover:scale-105 transition-transform cursor-pointer"
        aria-label="Open profile menu"
      >
        {initials}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute top-12 right-0 w-72 rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-200 dark:border-gray-700 backdrop-blur-md"
          style={{
            backgroundColor: darkMode ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          }}
        >
          {/* Profile header */}
          <div className="flex flex-col items-center pt-6 pb-4 px-4 border-b border-gray-200 dark:border-gray-700/60">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold mb-3 ring-4 ring-white/10">
              {initials}
            </div>
            <p className="text-sm font-semibold text-text-primary">Anonymous User</p>
            <p className="text-xs text-text-secondary mt-0.5 font-mono truncate max-w-full">
              {profileId ? `${profileId.slice(0, 8)}...` : '—'}
            </p>
          </div>

          {/* Settings */}
          <div className="py-1.5 px-2">
            {/* Projection toggle */}
            <button
              onClick={onToggleProjection}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-primary hover:bg-bg-secondary transition-colors text-left"
            >
              <span className="text-base">{projection === 'globe' ? '🌍' : '🗺️'}</span>
              <span className="flex-1">Projection</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary capitalize">
                {projection}
              </span>
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={onToggleDarkMode}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-primary hover:bg-bg-secondary transition-colors text-left"
            >
              <span className="text-base">{darkMode ? '🌙' : '☀️'}</span>
              <span className="flex-1">Dark Mode</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary">
                {darkMode ? 'On' : 'Off'}
              </span>
            </button>
          </div>

          {/* Map info */}
          <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700/60">
            <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary">
              <span>Zoom {mapInfo.zoom.toFixed(1)}</span>
              <span>Pitch {mapInfo.pitch.toFixed(0)}°</span>
              <span>Bearing {mapInfo.bearing.toFixed(0)}°</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
