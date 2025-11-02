'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setError(null);
    setSigningOut(true);

    try {
      // Capture context before sign out
      const context = {
        timestamp: new Date().toISOString(),
        userAgent:
          typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        sessionStorageKeys:
          typeof window !== 'undefined'
            ? Array.from({ length: sessionStorage.length }, (_, i) =>
                sessionStorage.key(i)
              )
            : [],
      };

      // Wrap signOut in a promise and set a timeout to catch hanging operations
      const signOutPromise = new Promise<void>((resolve, reject) => {
        // Set a timeout to catch if signOut hangs
        const timeout = setTimeout(() => {
          reject(new Error('Sign out timed out after 10 seconds'));
        }, 10000);

        try {
          // NextAuth signOut might not return a promise in all cases
          // We'll handle it both ways
          const result = signOut({
            callbackUrl: '/login',
            redirect: false, // Don't auto-redirect so we can handle errors
          });

          // If it's a promise, wait for it
          if (result && typeof result.then === 'function') {
            result
              .then(() => {
                clearTimeout(timeout);
                resolve();
              })
              .catch((err) => {
                clearTimeout(timeout);
                reject(err);
              });
          } else {
            // If it's not a promise, resolve immediately
            clearTimeout(timeout);
            resolve();
          }
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });

      await signOutPromise;

      // If we get here, sign out succeeded, now redirect manually
      router.push('/login');
      router.refresh(); // Force a refresh to clear any cached session data
    } catch (err) {
      // Capture detailed error information
      const errorObj = err instanceof Error ? err : new Error(String(err));

      const errorDetails = {
        message: errorObj.message,
        stack: errorObj.stack,
        name: errorObj.name,
        toString: errorObj.toString(),
        userAgent:
          typeof window !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        sessionStorageKeys:
          typeof window !== 'undefined'
            ? Array.from(
                { length: sessionStorage.length },
                (_, i) => sessionStorage.key(i) || ''
              ).filter(Boolean)
            : [],
        cookieEnabled:
          typeof navigator !== 'undefined'
            ? navigator.cookieEnabled
            : undefined,
      };

      // Log to console with full details for debugging
      console.error('Sign out error - Full details:', {
        errorDetails,
        fullError: err,
        errorString: JSON.stringify(errorDetails, null, 2),
      });

      // Create a detailed error message for display
      const errorMessage =
        `LOG OUT ERROR\n\n` +
        `Error Message: ${errorDetails.message}\n` +
        `Error Type: ${errorDetails.name}\n` +
        `Timestamp: ${errorDetails.timestamp}\n` +
        `Current URL: ${errorDetails.url}\n` +
        `Browser: ${errorDetails.userAgent?.substring(0, 80)}...\n` +
        `Cookies Enabled: ${errorDetails.cookieEnabled}\n` +
        `Session Storage Keys: ${errorDetails.sessionStorageKeys.join(', ') || 'none'}\n\n` +
        `STACK TRACE:\n${errorDetails.stack || 'No stack trace available'}\n\n` +
        `TROUBLESHOOTING:\n` +
        `1. Check browser console (F12) for more details\n` +
        `2. Try refreshing the page and logging out again\n` +
        `3. Clear browser cache and cookies\n` +
        `4. If this persists, copy this entire message and contact support`;

      setError(errorMessage);

      // Show an alert with key information
      alert(
        `Log Out Failed\n\n` +
          `Error: ${errorDetails.message}\n` +
          `Time: ${errorDetails.timestamp}\n` +
          `Type: ${errorDetails.name}\n\n` +
          `A detailed error message is shown below the button.\n` +
          `Please check the browser console (F12) for full technical details.\n\n` +
          `Stack trace and full details logged to console.`
      );

      setSigningOut(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="btn btn-outline h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {signingOut ? 'Logging out...' : 'Log Out'}
      </button>

      {error && (
        <div className="fixed bottom-4 left-4 w-96 max-w-[calc(100vw-2rem)] p-4 bg-red-900/95 backdrop-blur-sm border-2 border-red-700 rounded-lg shadow-2xl z-[9999] text-xs">
          <div className="flex items-start justify-between mb-2">
            <div className="font-bold text-red-100 text-sm">
              Log Out Error - Debug Information
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-200 text-lg font-bold leading-none"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
          <div className="text-red-200 whitespace-pre-wrap break-words max-h-64 overflow-y-auto bg-black/20 p-2 rounded font-mono text-[10px] leading-tight">
            {error}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(error).catch(() => {});
                alert('Error details copied to clipboard');
              }}
              className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-red-100 rounded text-xs font-medium transition-colors"
            >
              Copy Error Details
            </button>
            <button
              onClick={() => {
                window.location.href = '/login';
              }}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded text-xs font-medium transition-colors"
            >
              Go to Log In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
