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
        className="btn btn-ghost h-10 w-10 p-0"
        aria-label="Toggle theme"
      >
        <span className="sr-only">Loading theme</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setTheme('light')}
        className={`btn h-10 px-3 ${
          theme === 'light' ? 'btn-primary' : 'btn-ghost'
        }`}
        aria-label="Light theme"
        aria-pressed={theme === 'light'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
          />
        </svg>
        <span className="ml-2">Light</span>
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`btn h-10 px-3 ${
          theme === 'dark' ? 'btn-primary' : 'btn-ghost'
        }`}
        aria-label="Dark theme"
        aria-pressed={theme === 'dark'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
          />
        </svg>
        <span className="ml-2">Dark</span>
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`btn h-10 px-3 ${
          theme === 'system' ? 'btn-primary' : 'btn-ghost'
        }`}
        aria-label="System theme"
        aria-pressed={theme === 'system'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
          />
        </svg>
        <span className="ml-2">System</span>
      </button>
      <span className="text-xs text-muted-foreground ml-2">
        ({resolvedTheme})
      </span>
    </div>
  );
}

