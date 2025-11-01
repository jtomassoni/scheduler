'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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
  totalTips: string;
  averageTip: string;
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

  useEffect(() => {
    if (startDate && endDate && status === 'authenticated') {
      fetchTipHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, status]);

  async function fetchTipHistory() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/tips/history?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch tip history');
      }

      const data = await response.json();
      setTipData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tips');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">My Tips</h1>
              <p className="text-sm text-muted-foreground">
                View your tip earnings history
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn btn-outline"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Selector */}
        <div className="card mb-6">
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="form-label">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="form-label">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-6" role="alert">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {tipData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="card">
                <div className="card-content">
                  <div className="text-sm text-muted-foreground">
                    Total Shifts
                  </div>
                  <div className="text-3xl font-bold">
                    {tipData.totalShifts}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="text-sm text-muted-foreground">
                    Total Tips
                  </div>
                  <div className="text-3xl font-bold text-success">
                    ${tipData.totalTips}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="text-sm text-muted-foreground">
                    Average per Shift
                  </div>
                  <div className="text-3xl font-bold">
                    ${tipData.averageTip}
                  </div>
                </div>
              </div>
            </div>

            {/* Tip History Table */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold">Tip History</h2>
              </div>
              <div className="card-content">
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">
                    Loading...
                  </p>
                ) : tipData.tips.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No tips found for this period
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-3 px-4">Date</th>
                          <th className="text-left py-3 px-4">Venue</th>
                          <th className="text-right py-3 px-4">Amount</th>
                          <th className="text-left py-3 px-4">Entered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tipData.tips.map((tip) => (
                          <tr key={tip.id} className="border-b border-border">
                            <td className="py-3 px-4">
                              {new Date(tip.date).toLocaleDateString(
                                'default',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }
                              )}
                            </td>
                            <td className="py-3 px-4">{tip.venue}</td>
                            <td className="py-3 px-4 text-right font-semibold text-success">
                              ${tip.amount}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
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
            </div>
          </>
        )}
      </main>
    </div>
  );
}
