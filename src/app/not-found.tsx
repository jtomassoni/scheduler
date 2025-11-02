'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';
import { useSession } from 'next-auth/react';

export default function NotFound() {
  const router = useRouter();
  const { data: session } = useSession();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <PremiumLayout>
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Page Not Found
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {session?.user && (
                  <div className="hidden sm:flex flex-col items-end text-right">
                    <div className="text-sm font-medium text-gray-200">
                      {session.user.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {session.user.email}
                    </div>
                  </div>
                )}
                {session && <UserMenu />}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <PremiumCard className="mb-8">
              <div className="p-12">
                <div className="text-6xl mb-6">404</div>
                <h2 className="text-3xl font-bold text-foreground dark:text-gray-100 mb-4">
                  Page Not Found
                </h2>
                <p className="text-lg text-muted-foreground dark:text-gray-400 mb-8 max-w-md mx-auto">
                  The page you&apos;re looking for doesn&apos;t exist or has
                  been moved. Let&apos;s get you back on track.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={goBack}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                  >
                    Go Back
                  </button>
                  <Link
                    href="/dashboard"
                    className="px-6 py-3 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            </PremiumCard>

            <div className="text-center">
              <p className="text-sm text-muted-foreground dark:text-gray-500">
                If you believe this is an error, please contact support.
              </p>
            </div>
          </div>
        </main>
      </div>
    </PremiumLayout>
  );
}
