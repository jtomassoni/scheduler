'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';

interface TipEntry {
  id: string;
  shiftId: string;
  date: string;
  venue: string;
  amount: string;
  enteredAt: string | null;
  updatedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TipHistoryData {
  startDate: string;
  endDate: string;
  userId: string | null;
  totalShifts: number;
  totalShiftsWithTips: number;
  totalTips: string;
  averageTip: string;
  averageShiftsAcrossAllUsers: string;
  tips: TipEntry[];
}

export default function TipHistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tipData, setTipData] = useState<TipHistoryData | null>(null);
  const [reportGenerated, setReportGenerated] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // Set default dates (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  async function generateReport() {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError('');
    setReportGenerated(false);

    try {
      const response = await fetch(
        `/api/tips/history?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch tip history');
      }

      const data = await response.json();
      setTipData(data);
      setReportGenerated(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate report'
      );
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading') {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading tips report...</p>
        </div>
      </PremiumLayout>
    );
  }

  const userShifts = tipData?.totalShifts || 0;
  const avgShifts = parseFloat(tipData?.averageShiftsAcrossAllUsers || '0');
  const comparisonText =
    userShifts > avgShifts
      ? `${userShifts} shifts (above average of ${avgShifts})`
      : userShifts < avgShifts
        ? `${userShifts} shifts (below average of ${avgShifts})`
        : `${userShifts} shifts (at average of ${avgShifts})`;

  return (
    <PremiumLayout>
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Tips & Earnings Report
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  View your tip earnings and shift statistics
                </p>
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
                <UserMenu />
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Date Range Selector */}
          <PremiumCard className="mb-6">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-foreground dark:text-gray-300 mb-2"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-foreground dark:text-gray-300 mb-2"
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div>
                  <button
                    onClick={generateReport}
                    disabled={loading}
                    className="w-full px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              </div>
            </div>
          </PremiumCard>

          {/* Error Display */}
          {error && (
            <PremiumCard className="mb-6 border-red-500/30">
              <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              </div>
            </PremiumCard>
          )}

          {/* Summary Cards */}
          {tipData && reportGenerated && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <PremiumCard>
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground dark:text-gray-400 mb-1">
                      Total Shifts
                    </div>
                    <div className="text-2xl font-bold text-foreground dark:text-gray-100">
                      {tipData.totalShifts}
                    </div>
                    {tipData.averageShiftsAcrossAllUsers && (
                      <div className="text-xs text-muted-foreground dark:text-gray-500 mt-1">
                        Avg: {tipData.averageShiftsAcrossAllUsers}
                      </div>
                    )}
                  </div>
                </PremiumCard>

                <PremiumCard>
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground dark:text-gray-400 mb-1">
                      Shifts with Tips
                    </div>
                    <div className="text-2xl font-bold text-foreground dark:text-gray-100">
                      {tipData.totalShiftsWithTips}
                    </div>
                    <div className="text-xs text-muted-foreground dark:text-gray-500 mt-1">
                      {tipData.totalShifts > 0
                        ? Math.round(
                            (tipData.totalShiftsWithTips /
                              tipData.totalShifts) *
                              100
                          )
                        : 0}
                      % of shifts
                    </div>
                  </div>
                </PremiumCard>

                <PremiumCard>
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground dark:text-gray-400 mb-1">
                      Total Tips
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${tipData.totalTips}
                    </div>
                  </div>
                </PremiumCard>

                <PremiumCard>
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground dark:text-gray-400 mb-1">
                      Average per Shift
                    </div>
                    <div className="text-2xl font-bold text-foreground dark:text-gray-100">
                      ${tipData.averageTip}
                    </div>
                  </div>
                </PremiumCard>
              </div>

              {/* Comparison Card */}
              {tipData.averageShiftsAcrossAllUsers && (
                <PremiumCard className="mb-6 border-purple-500/30">
                  <div className="p-4">
                    <div className="text-sm font-medium text-foreground dark:text-gray-300 mb-2">
                      Shift Comparison
                    </div>
                    <div className="text-base text-muted-foreground dark:text-gray-400">
                      You worked{' '}
                      <span className="font-semibold text-foreground dark:text-gray-200">
                        {comparisonText}
                      </span>{' '}
                      in this period.
                      {userShifts < avgShifts && (
                        <span className="block text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          Even though {userShifts} isn&apos;t a lot, it&apos;s
                          below the average. Consider discussing availability
                          with management if you&apos;d like more shifts.
                        </span>
                      )}
                      {userShifts > avgShifts && (
                        <span className="block text-xs text-green-600 dark:text-green-400 mt-1">
                          Great job! You&apos;re working more shifts than
                          average.
                        </span>
                      )}
                    </div>
                  </div>
                </PremiumCard>
              )}

              {/* Tip History Table */}
              <PremiumCard>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-foreground dark:text-gray-100 mb-4">
                    Tip History
                  </h2>
                  {loading ? (
                    <p className="text-muted-foreground dark:text-gray-400 text-center py-8">
                      Loading tips...
                    </p>
                  ) : tipData.tips.length === 0 ? (
                    <p className="text-muted-foreground dark:text-gray-400 text-center py-8">
                      No tips found for this period
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-gray-800 dark:border-gray-700">
                          <tr>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground dark:text-gray-300">
                              Date
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground dark:text-gray-300">
                              Venue
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-foreground dark:text-gray-300">
                              Amount
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground dark:text-gray-300">
                              Entered
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tipData.tips.map((tip) => (
                            <tr
                              key={tip.id}
                              className="border-b border-gray-800 dark:border-gray-700 hover:bg-gray-800/20 dark:hover:bg-gray-800/10 transition-colors"
                            >
                              <td className="py-3 px-4 text-sm text-foreground dark:text-gray-300">
                                {new Date(tip.date).toLocaleDateString(
                                  'default',
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  }
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-foreground dark:text-gray-300">
                                {tip.venue}
                              </td>
                              <td className="py-3 px-4 text-right text-sm font-semibold text-green-600 dark:text-green-400">
                                ${tip.amount}
                              </td>
                              <td className="py-3 px-4 text-sm text-muted-foreground dark:text-gray-400">
                                {tip.enteredAt
                                  ? new Date(tip.enteredAt).toLocaleDateString(
                                      'default',
                                      {
                                        month: 'short',
                                        day: 'numeric',
                                      }
                                    )
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </PremiumCard>
            </>
          )}

          {!reportGenerated && !loading && (
            <PremiumCard>
              <div className="p-12 text-center">
                <p className="text-muted-foreground dark:text-gray-400">
                  Select a date range and click &quot;Generate Report&quot; to
                  view your tips and earnings
                </p>
              </div>
            </PremiumCard>
          )}
        </main>
      </div>
    </PremiumLayout>
  );
}
