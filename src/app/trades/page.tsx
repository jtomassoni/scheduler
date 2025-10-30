'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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

  function getStatusBadge(status: string) {
    const badges: Record<string, string> = {
      PROPOSED: 'badge badge-info',
      ACCEPTED: 'badge badge-warning',
      APPROVED: 'badge badge-success',
      DECLINED: 'badge badge-error',
      CANCELLED: 'badge',
    };
    return badges[status] || 'badge';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading trades...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Shift Trades</h1>
              <p className="text-sm text-muted-foreground">
                {isManager
                  ? 'View and approve shift trade requests'
                  : 'Propose and manage shift trades'}
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
        {/* Filters */}
        <div className="mb-6">
          <label htmlFor="statusFilter" className="form-label">
            Filter by Status
          </label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="all">All Statuses</option>
            <option value="proposed">Proposed</option>
            <option value="accepted">Accepted (Pending Manager)</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {error && (
          <div className="alert alert-error mb-6" role="alert">
            {error}
          </div>
        )}

        {/* Trades List */}
        {trades.length === 0 ? (
          <div className="card">
            <div className="card-content text-center py-12">
              <p className="text-muted-foreground">No shift trades found</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {trades.map((trade) => {
              const isProposer = trade.proposer.id === session?.user?.id;
              const isReceiver = trade.receiver.id === session?.user?.id;
              const needsReceiverResponse =
                trade.status === 'PROPOSED' && isReceiver;
              const needsManagerApproval =
                trade.status === 'ACCEPTED' && isManager;

              return (
                <div key={trade.id} className="card">
                  <div className="card-content">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {trade.shift.venue.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(trade.shift.date).toLocaleDateString(
                            'default',
                            {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )}{' '}
                          • {trade.shift.startTime} - {trade.shift.endTime}
                        </p>
                      </div>
                      <span className={getStatusBadge(trade.status)}>
                        {trade.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">From:</span>{' '}
                        <span className="font-medium">
                          {trade.proposer.name}
                        </span>
                        {isProposer && (
                          <span className="text-primary ml-1">(You)</span>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">To:</span>{' '}
                        <span className="font-medium">
                          {trade.receiver.name}
                        </span>
                        {isReceiver && (
                          <span className="text-primary ml-1">(You)</span>
                        )}
                      </div>
                    </div>

                    {trade.reason && (
                      <div className="text-sm mb-4">
                        <span className="text-muted-foreground">Reason:</span>{' '}
                        <span>{trade.reason}</span>
                      </div>
                    )}

                    {trade.declinedReason && (
                      <div className="text-sm mb-4 text-destructive">
                        <span className="font-medium">Declined Reason:</span>{' '}
                        <span>{trade.declinedReason}</span>
                      </div>
                    )}

                    {/* Receiver Actions */}
                    {needsReceiverResponse && (
                      <div className="border-t border-border pt-4">
                        <p className="text-sm mb-4 text-blue-600 dark:text-blue-400">
                          This trade request is waiting for your response
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(trade.id)}
                            className="btn btn-success flex-1"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecline(trade.id)}
                            className="btn btn-outline text-destructive hover:bg-destructive hover:text-destructive-foreground flex-1"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Manager Approval */}
                    {needsManagerApproval && (
                      <div className="border-t border-border pt-4">
                        <p className="text-sm mb-4 text-yellow-600 dark:text-yellow-400">
                          This trade has been accepted by both parties and needs
                          manager approval
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleManagerApprove(trade.id, true)}
                            className="btn btn-success flex-1"
                          >
                            Approve Trade
                          </button>
                          <button
                            onClick={() =>
                              handleManagerApprove(trade.id, false)
                            }
                            className="btn btn-outline text-destructive hover:bg-destructive hover:text-destructive-foreground flex-1"
                          >
                            Decline Trade
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Status Info */}
                    {trade.status === 'ACCEPTED' && !isManager && (
                      <div className="border-t border-border pt-4">
                        <p className="text-sm text-muted-foreground">
                          Waiting for manager approval...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
