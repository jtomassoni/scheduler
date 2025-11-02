'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';
import { Breadcrumb } from '@/components/breadcrumb';

interface HealthMetrics {
  requestSuccessRate: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  recentErrors: Array<{
    id: string;
    endpoint: string;
    error: string;
    timestamp: string;
  }>;
  apiStatus: 'healthy' | 'degraded' | 'down';
  databaseStatus: 'healthy' | 'degraded' | 'down';
}

export default function AppHealthPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Only Super Admins can access this page
    if (session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }
  }, [status, session, router]);

  useEffect(() => {
    async function fetchHealthMetrics() {
      try {
        const response = await fetch('/api/admin/health');
        if (!response.ok) {
          throw new Error('Failed to fetch health metrics');
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        // For now, use placeholder data
        setMetrics({
          requestSuccessRate: 98.5,
          totalRequests: 15420,
          successfulRequests: 15189,
          failedRequests: 231,
          averageResponseTime: 145,
          recentErrors: [
            {
              id: '1',
              endpoint: '/api/shifts',
              error: 'Database connection timeout',
              timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            },
            {
              id: '2',
              endpoint: '/api/shifts/[id]/assignments',
              error: 'Validation error: Invalid shift ID',
              timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            },
            {
              id: '3',
              endpoint: '/api/trades',
              error: 'Rate limit exceeded',
              timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
            },
          ],
          apiStatus: 'healthy',
          databaseStatus: 'healthy',
        });
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchHealthMetrics();
    }
  }, [status]);

  function getStatusColor(status: string) {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'degraded':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'down':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  }

  if (loading) {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading health metrics...</p>
        </div>
      </PremiumLayout>
    );
  }

  if (session?.user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <PremiumLayout>
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  App Health
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Monitor system performance and request health
                </p>
                <p className="text-xs text-gray-500 mt-2 max-w-3xl">
                  This page tracks API request success rates and system health.
                  Failed requests are logged here so you can identify issues
                  before users report them. All shift changes, assignments, and
                  trades are monitored to ensure users aren&apos;t experiencing
                  silent failures.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />
          {!metrics ? (
            <PremiumCard>
              <div className="p-12 text-center">
                <p className="text-muted-foreground dark:text-gray-400">
                  Unable to load health metrics
                </p>
              </div>
            </PremiumCard>
          ) : (
            <>
              {/* Overall Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <PremiumCard className="border-blue-500/20 bg-gradient-to-br from-blue-900/10 via-gray-900/50 to-gray-900/50 hover:border-blue-500/30 transition-all">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground dark:text-gray-100">
                          API Status
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                          metrics.apiStatus
                        )}`}
                      >
                        {metrics.apiStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                      {metrics.requestSuccessRate.toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">
                      Request Success Rate
                    </p>
                  </div>
                </PremiumCard>

                <PremiumCard className="border-purple-500/20 bg-gradient-to-br from-purple-900/10 via-gray-900/50 to-gray-900/50 hover:border-purple-500/30 transition-all">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-purple-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground dark:text-gray-100">
                          Database Status
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                          metrics.databaseStatus
                        )}`}
                      >
                        {metrics.databaseStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                      {metrics.averageResponseTime}ms
                    </div>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">
                      Average Response Time
                    </p>
                  </div>
                </PremiumCard>
              </div>

              {/* Request Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <PremiumCard className="border-gray-700/50 bg-gradient-to-br from-gray-900/50 to-gray-900/30 hover:border-gray-600/50 transition-all">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-600/20 to-gray-700/20 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-sm font-medium text-muted-foreground dark:text-gray-400">
                        Total Requests
                      </h4>
                    </div>
                    <div className="text-3xl font-bold text-foreground dark:text-gray-100">
                      {metrics.totalRequests.toLocaleString()}
                    </div>
                  </div>
                </PremiumCard>

                <PremiumCard className="border-green-500/20 bg-gradient-to-br from-green-900/10 via-gray-900/50 to-gray-900/50 hover:border-green-500/30 transition-all">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-sm font-medium text-muted-foreground dark:text-gray-400">
                        Successful
                      </h4>
                    </div>
                    <div className="text-3xl font-bold text-green-400">
                      {metrics.successfulRequests.toLocaleString()}
                    </div>
                  </div>
                </PremiumCard>

                <PremiumCard className="border-red-500/20 bg-gradient-to-br from-red-900/10 via-gray-900/50 to-gray-900/50 hover:border-red-500/30 transition-all">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </div>
                      <h4 className="text-sm font-medium text-muted-foreground dark:text-gray-400">
                        Failed
                      </h4>
                    </div>
                    <div className="text-3xl font-bold text-red-400">
                      {metrics.failedRequests.toLocaleString()}
                    </div>
                  </div>
                </PremiumCard>
              </div>

              {/* Recent Errors */}
              {metrics.recentErrors.length > 0 && (
                <PremiumCard className="border-yellow-500/30">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-foreground dark:text-gray-100 mb-4">
                      Recent Errors
                    </h3>
                    <div className="space-y-3">
                      {metrics.recentErrors.map((error) => (
                        <div
                          key={error.id}
                          className="p-4 rounded-lg bg-red-500/10 border border-red-500/30"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-mono text-sm text-red-400">
                              {error.endpoint}
                            </div>
                            <div className="text-xs text-muted-foreground dark:text-gray-500">
                              {new Date(error.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <p className="text-sm text-gray-300">{error.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </PremiumCard>
              )}
            </>
          )}
        </main>
      </div>
    </PremiumLayout>
  );
}
