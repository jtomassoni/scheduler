'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';

interface Trade {
  id: string;
  status: string;
  reason: string | null;
  declinedReason: string | null;
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: {
      name: string;
    };
  };
  proposer: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  receiver: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export default function TradesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isManager =
    session?.user?.role === 'MANAGER' || session?.user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchTrades() {
      try {
        const params = new URLSearchParams();
        if (filterStatus !== 'all') {
          params.append('status', filterStatus.toUpperCase());
        }

        const response = await fetch(`/api/trades?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch trades');
        }
        const data = await response.json();
        setTrades(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trades');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchTrades();
    }
  }, [status, filterStatus]);

  async function handleAccept(tradeId: string) {
    try {
      const response = await fetch(`/api/trades/${tradeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'ACCEPTED',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to accept trade');
      }

      // Refresh trades
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus.toUpperCase());
      }
      const refreshResponse = await fetch(`/api/trades?${params}`);
      const refreshedData = await refreshResponse.json();
      setTrades(refreshedData);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to accept trade');
    }
  }

  async function handleDecline(tradeId: string) {
    try {
      const response = await fetch(`/api/trades/${tradeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'DECLINED',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to decline trade');
      }

      // Refresh trades
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus.toUpperCase());
      }
      const refreshResponse = await fetch(`/api/trades?${params}`);
      const refreshedData = await refreshResponse.json();
      setTrades(refreshedData);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to decline trade');
    }
  }

  async function handleManagerApprove(tradeId: string, approved: boolean) {
    try {
      const declinedReason = approved
        ? undefined
        : prompt('Please provide a reason for declining this trade:');

      if (!approved && !declinedReason) {
        return; // User cancelled
      }

      const response = await fetch(`/api/trades/${tradeId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved,
          declinedReason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process approval');
      }

      // Refresh trades
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus.toUpperCase());
      }
      const refreshResponse = await fetch(`/api/trades?${params}`);
      const refreshedData = await refreshResponse.json();
      setTrades(refreshedData);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process approval');
    }
  }

  if (loading) {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading trades...</p>
        </div>
      </PremiumLayout>
    );
  }

  return (
    <PremiumLayout>
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Shift Trades
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  {isManager
                    ? 'View and approve shift trade requests'
                    : 'Propose and manage shift trades'}
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
          {/* Filters */}
          <PremiumCard className="mb-6">
            <div className="p-4">
              <div className="flex items-center gap-4">
                <label
                  htmlFor="statusFilter"
                  className="text-sm font-medium text-foreground dark:text-gray-300 whitespace-nowrap"
                >
                  Filter by Status:
                </label>
                <select
                  id="statusFilter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 flex-1 max-w-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="proposed">Proposed</option>
                  <option value="accepted">Accepted (Pending Manager)</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </PremiumCard>

          {error && (
            <PremiumCard className="mb-6 border-red-500/30">
              <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              </div>
            </PremiumCard>
          )}

          {/* Trades List */}
          {trades.length === 0 ? (
            <PremiumCard>
              <div className="p-12 text-center">
                <p className="text-muted-foreground dark:text-gray-400">
                  No shift trades found
                </p>
              </div>
            </PremiumCard>
          ) : (
            <div className="space-y-3">
              {trades.map((trade) => {
                const isProposer = trade.proposer.id === session?.user?.id;
                const isReceiver = trade.receiver.id === session?.user?.id;
                const needsReceiverResponse =
                  trade.status === 'PROPOSED' && isReceiver;
                const needsManagerApproval =
                  trade.status === 'ACCEPTED' && isManager;

                return (
                  <PremiumCard key={trade.id}>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-foreground dark:text-gray-100">
                            {trade.shift.venue.name}
                          </h3>
                          <p className="text-sm text-muted-foreground dark:text-gray-400">
                            {new Date(trade.shift.date).toLocaleDateString(
                              'default',
                              {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )}{' '}
                            • {trade.shift.startTime} - {trade.shift.endTime}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            trade.status === 'APPROVED'
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                              : trade.status === 'PROPOSED'
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                                : trade.status === 'ACCEPTED'
                                  ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20'
                                  : trade.status === 'DECLINED'
                                    ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                                    : 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border border-gray-500/20'
                          }`}
                        >
                          {trade.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground dark:text-gray-400">
                            From:
                          </span>{' '}
                          <span className="font-medium text-foreground dark:text-gray-200">
                            {trade.proposer.name}
                          </span>
                          {isProposer && (
                            <span className="text-purple-400 ml-1">(You)</span>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground dark:text-gray-400">
                            To:
                          </span>{' '}
                          <span className="font-medium text-foreground dark:text-gray-200">
                            {trade.receiver.name}
                          </span>
                          {isReceiver && (
                            <span className="text-purple-400 ml-1">(You)</span>
                          )}
                        </div>
                      </div>

                      {trade.reason && (
                        <div className="text-sm mb-3 text-muted-foreground dark:text-gray-400">
                          <span className="font-medium">Reason:</span>{' '}
                          {trade.reason}
                        </div>
                      )}

                      {trade.declinedReason && (
                        <div className="text-sm mb-3 text-red-600 dark:text-red-400">
                          <span className="font-medium">Declined Reason:</span>{' '}
                          {trade.declinedReason}
                        </div>
                      )}

                      {/* Receiver Actions */}
                      {needsReceiverResponse && (
                        <div className="border-t border-gray-800 dark:border-gray-700 pt-3 mt-3">
                          <p className="text-sm mb-3 text-blue-600 dark:text-blue-400">
                            This trade request is waiting for your response
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAccept(trade.id)}
                              className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-500 transition-all flex-1"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDecline(trade.id)}
                              className="px-4 py-2 rounded-lg border border-red-700 dark:border-red-600 bg-red-50 dark:bg-red-800/50 text-red-700 dark:text-red-300 font-medium hover:bg-red-100 dark:hover:bg-red-800 transition-all flex-1"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Manager Approval */}
                      {needsManagerApproval && (
                        <div className="border-t border-gray-800 dark:border-gray-700 pt-3 mt-3">
                          <p className="text-sm mb-3 text-yellow-600 dark:text-yellow-400">
                            This trade has been accepted by both parties and
                            needs manager approval
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleManagerApprove(trade.id, true)
                              }
                              className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-500 transition-all flex-1"
                            >
                              Approve Trade
                            </button>
                            <button
                              onClick={() =>
                                handleManagerApprove(trade.id, false)
                              }
                              className="px-4 py-2 rounded-lg border border-red-700 dark:border-red-600 bg-red-50 dark:bg-red-800/50 text-red-700 dark:text-red-300 font-medium hover:bg-red-100 dark:hover:bg-red-800 transition-all flex-1"
                            >
                              Decline Trade
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Status Info */}
                      {trade.status === 'ACCEPTED' && !isManager && (
                        <div className="border-t border-gray-800 dark:border-gray-700 pt-3 mt-3">
                          <p className="text-sm text-muted-foreground dark:text-gray-400">
                            Waiting for manager approval...
                          </p>
                        </div>
                      )}
                    </div>
                  </PremiumCard>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </PremiumLayout>
  );
}
