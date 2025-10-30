'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Override {
  id: string;
  reason: string;
  violationType: string;
  status: string;
  userId: string;
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: {
      name: string;
    };
  };
  approvals: Array<{
    id: string;
    approved: boolean;
    comment: string | null;
    approver: {
      id: string;
      name: string;
      role: string;
    };
  }>;
  createdAt: string;
}

export default function OverridesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [overrides, setOverrides] = useState<Override[]>([]);
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
    async function fetchOverrides() {
      try {
        const params = new URLSearchParams();
        if (filterStatus !== 'all') {
          params.append('status', filterStatus.toUpperCase());
        }

        const response = await fetch(`/api/overrides?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch overrides');
        }
        const data = await response.json();
        setOverrides(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load overrides'
        );
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchOverrides();
    }
  }, [status, filterStatus]);

  async function handleApprove(overrideId: string, approved: boolean) {
    try {
      const response = await fetch(`/api/overrides/${overrideId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved,
          comment: approved
            ? 'Approved by staff member'
            : 'Declined by staff member',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process approval');
      }

      // Refresh overrides
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus.toUpperCase());
      }
      const refreshResponse = await fetch(`/api/overrides?${params}`);
      const refreshedData = await refreshResponse.json();
      setOverrides(refreshedData);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process approval');
    }
  }

  function getViolationTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      cutoff: 'Day Job Cutoff',
      request_off: 'Requested Off',
      double_booking: 'Double Booking',
      lead_shortage: 'Lead Shortage',
    };
    return labels[type] || type;
  }

  function getStatusBadge(status: string) {
    const badges: Record<string, string> = {
      PENDING: 'badge badge-warning',
      APPROVED: 'badge badge-info',
      ACTIVE: 'badge badge-success',
      DECLINED: 'badge badge-error',
    };
    return badges[status] || 'badge';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading overrides...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Override Requests</h1>
              <p className="text-sm text-muted-foreground">
                {isManager
                  ? 'View and manage override requests'
                  : 'Review override requests that require your approval'}
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="declined">Declined</option>
          </select>
        </div>

        {error && (
          <div className="alert alert-error mb-6" role="alert">
            {error}
          </div>
        )}

        {/* Overrides List */}
        {overrides.length === 0 ? (
          <div className="card">
            <div className="card-content text-center py-12">
              <p className="text-muted-foreground">
                No override requests found
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {overrides.map((override) => {
              const needsStaffApproval =
                override.status === 'PENDING' &&
                override.userId === session?.user?.id &&
                !override.approvals.some(
                  (a) => a.approver.id === session?.user?.id
                );

              return (
                <div key={override.id} className="card">
                  <div className="card-content">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {override.shift.venue.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(override.shift.date).toLocaleDateString(
                            'default',
                            {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )}{' '}
                          • {override.shift.startTime} -{' '}
                          {override.shift.endTime}
                        </p>
                      </div>
                      <span className={getStatusBadge(override.status)}>
                        {override.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">
                          Violation Type:
                        </span>{' '}
                        <span className="font-medium">
                          {getViolationTypeLabel(override.violationType)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reason:</span>{' '}
                        <span className="font-medium">{override.reason}</span>
                      </div>
                    </div>

                    {/* Approvals */}
                    {override.approvals.length > 0 && (
                      <div className="border-t border-border pt-4">
                        <h4 className="font-semibold text-sm mb-2">
                          Approvals
                        </h4>
                        <div className="space-y-2">
                          {override.approvals.map((approval) => (
                            <div
                              key={approval.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <div>
                                <span className="font-medium">
                                  {approval.approver.name}
                                </span>{' '}
                                <span className="text-muted-foreground">
                                  ({approval.approver.role})
                                </span>
                              </div>
                              <span
                                className={
                                  approval.approved
                                    ? 'badge badge-success'
                                    : 'badge badge-error'
                                }
                              >
                                {approval.approved ? 'Approved' : 'Declined'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Staff Approval Actions */}
                    {needsStaffApproval && (
                      <div className="border-t border-border pt-4 mt-4">
                        <p className="text-sm mb-4 text-yellow-600 dark:text-yellow-400">
                          This override request requires your approval
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(override.id, true)}
                            className="btn btn-success flex-1"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApprove(override.id, false)}
                            className="btn btn-outline text-destructive hover:bg-destructive hover:text-destructive-foreground flex-1"
                          >
                            Decline
                          </button>
                        </div>
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
