'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';
import { Breadcrumb } from '@/components/breadcrumb';

interface SystemMetrics {
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  totalOverrides: number;
  overrideApprovalRate: number;
  totalLeads: number;
  pendingLeads: number;
  activeLeads: number;
  totalUsers: number;
  activeUsers: number;
  totalVenues: number;
  totalShifts: number;
  revenueByClient: Array<{
    clientName: string;
    revenue: number;
    venues: number;
  }>;
}

export default function SystemReportsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
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
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/admin/system-metrics');
        if (!response.ok) {
          throw new Error('Failed to fetch system metrics');
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        // For now, use placeholder data
        setMetrics({
          totalClients: 12,
          activeClients: 9,
          totalRevenue: 47850,
          monthlyRecurringRevenue: 4200,
          totalOverrides: 147,
          overrideApprovalRate: 68.5,
          totalLeads: 34,
          pendingLeads: 8,
          activeLeads: 18,
          totalUsers: 284,
          activeUsers: 197,
          totalVenues: 18,
          totalShifts: 1247,
          revenueByClient: [
            { clientName: 'Mission Ballroom', revenue: 12000, venues: 1 },
            { clientName: 'Downtown Bar & Grill', revenue: 8500, venues: 2 },
            { clientName: 'Riverside Tavern', revenue: 7200, venues: 1 },
            { clientName: 'The Grand Hotel', revenue: 6100, venues: 3 },
            { clientName: 'Sunset Lounge', revenue: 5400, venues: 1 },
          ],
        });
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchMetrics();
    }
  }, [status]);

  if (loading) {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading system reports...</p>
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
                  System Reports
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Business metrics, revenue, and client analytics
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
                  Unable to load system metrics
                </p>
              </div>
            </PremiumCard>
          ) : (
            <>
              {/* Revenue Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <PremiumCard className="border-green-500/20 bg-gradient-to-br from-green-900/10 via-gray-900/50 to-gray-900/50 hover:border-green-500/30 transition-all">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground dark:text-gray-100">
                        Revenue Overview
                      </h3>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <div className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                          Total Revenue (All Time)
                        </div>
                        <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                          ${metrics.totalRevenue.toLocaleString()}
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-800">
                        <div className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                          Monthly Recurring Revenue
                        </div>
                        <div className="text-2xl font-bold text-foreground dark:text-gray-100">
                          ${metrics.monthlyRecurringRevenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </PremiumCard>

                <PremiumCard className="border-blue-500/20 bg-gradient-to-br from-blue-900/10 via-gray-900/50 to-gray-900/50 hover:border-blue-500/30 transition-all">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
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
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground dark:text-gray-100">
                        Client Metrics
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                          Total Clients
                        </div>
                        <div className="text-3xl font-bold text-foreground dark:text-gray-100">
                          {metrics.totalClients}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                          Active Clients
                        </div>
                        <div className="text-3xl font-bold text-green-400">
                          {metrics.activeClients}
                        </div>
                      </div>
                    </div>
                  </div>
                </PremiumCard>
              </div>

              {/* Business Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <PremiumCard className="border-purple-500/20 bg-gradient-to-br from-purple-900/10 via-gray-900/50 to-gray-900/50 hover:border-purple-500/30 transition-all">
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-purple-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground dark:text-gray-400">
                        Total Leads
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-foreground dark:text-gray-100 mb-1">
                      {metrics.totalLeads}
                    </div>
                    <div className="text-xs text-gray-500">
                      {metrics.activeLeads} active, {metrics.pendingLeads}{' '}
                      pending
                    </div>
                  </div>
                </PremiumCard>

                <PremiumCard className="border-orange-500/20 bg-gradient-to-br from-orange-900/10 via-gray-900/50 to-gray-900/50 hover:border-orange-500/30 transition-all">
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-orange-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground dark:text-gray-400">
                        Total Overrides
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-foreground dark:text-gray-100 mb-1">
                      {metrics.totalOverrides}
                    </div>
                    <div className="text-xs text-gray-500">
                      {metrics.overrideApprovalRate.toFixed(1)}% approval rate
                    </div>
                  </div>
                </PremiumCard>

                <PremiumCard className="border-cyan-500/20 bg-gradient-to-br from-cyan-900/10 via-gray-900/50 to-gray-900/50 hover:border-cyan-500/30 transition-all">
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-cyan-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground dark:text-gray-400">
                        Total Users
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-foreground dark:text-gray-100 mb-1">
                      {metrics.totalUsers}
                    </div>
                    <div className="text-xs text-gray-500">
                      {metrics.activeUsers} active
                    </div>
                  </div>
                </PremiumCard>

                <PremiumCard className="border-pink-500/20 bg-gradient-to-br from-pink-900/10 via-gray-900/50 to-gray-900/50 hover:border-pink-500/30 transition-all">
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-pink-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground dark:text-gray-400">
                        Total Venues
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-foreground dark:text-gray-100 mb-1">
                      {metrics.totalVenues}
                    </div>
                    <div className="text-xs text-gray-500">
                      {metrics.totalShifts.toLocaleString()} total shifts
                    </div>
                  </div>
                </PremiumCard>
              </div>

              {/* Revenue by Client */}
              {metrics.revenueByClient.length > 0 && (
                <PremiumCard>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-foreground dark:text-gray-100 mb-4">
                      Revenue by Client
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-gray-800 dark:border-gray-700">
                          <tr>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground dark:text-gray-300">
                              Client
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-foreground dark:text-gray-300">
                              Revenue
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-foreground dark:text-gray-300">
                              Venues
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.revenueByClient.map((client, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-gray-800 dark:border-gray-700 hover:bg-gray-800/20 dark:hover:bg-gray-800/10 transition-colors"
                            >
                              <td className="py-3 px-4 font-medium text-foreground dark:text-gray-200">
                                {client.clientName}
                              </td>
                              <td className="py-3 px-4 text-right text-green-400 font-semibold">
                                ${client.revenue.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right text-muted-foreground dark:text-gray-400">
                                {client.venues}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
