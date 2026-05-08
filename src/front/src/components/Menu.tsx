'use client';

import Link from 'next/link';

interface MenuProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Menu({ darkMode, onToggleDarkMode }: MenuProps) {
  return (
    <nav className="bg-bg-secondary text-text-primary p-4 flex justify-between items-center">
      <div className="flex gap-4">
        <Link href="/" className="hover:underline">Home</Link>
        <Link href="/feedback" className="hover:underline">Feedback</Link>
      </div>
      <button
        onClick={onToggleDarkMode}
        className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? '🌙' : '☀️'}
      </button>
    </nav>
  );
}
