'use client';

import { useTheme } from '@/lib/theme-provider';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background"
        aria-label="Toggle theme"
        disabled
      >
        <span className="sr-only">Loading theme</span>
      </button>
    );
  }

  // Cycle through themes: light -> dark -> light (skip system for manual toggling)
  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      // If currently on 'system', go to light
      setTheme('light');
    }
  };

  // Get the next theme for the tooltip
  const getNextTheme = () => {
    if (
      theme === 'light' ||
      (theme === 'system' && resolvedTheme === 'light')
    ) {
      return 'dark';
    }
    return 'light';
  };

  return (
    <button
      onClick={cycleTheme}
      className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm"
      aria-label={`Toggle theme (Current: ${resolvedTheme}, Next: ${getNextTheme()})`}
      title={`Theme: ${resolvedTheme === 'light' ? 'Light' : 'Dark'} → Next: ${getNextTheme() === 'light' ? 'Light' : 'Dark'}`}
    >
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {resolvedTheme === 'dark' ? 'Dark' : 'Light'} Mode
      </span>
      {resolvedTheme === 'dark' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4 text-gray-700 dark:text-gray-300"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4 text-gray-700 dark:text-gray-300"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
          />
        </svg>
      )}
    </button>
  );
}
