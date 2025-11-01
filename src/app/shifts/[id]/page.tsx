'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isLead: boolean;
}

interface ShiftAssignment {
  id: string;
  user: User;
  role: string;
  isLead: boolean;
  tipAmount?: number | null;
  tipEnteredAt?: string | null;
  tipUpdatedAt?: string | null;
}

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  bartendersRequired: number;
  barbacksRequired: number;
  leadsRequired: number;
  tipsPublished: boolean;
  tipsPublishedAt?: string | null;
  tipsPublishedBy?: string | null;
  venue: {
    id: string;
    name: string;
    tipPoolEnabled: boolean;
  };
  assignments: ShiftAssignment[];
}

export default function ShiftDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [shift, setShift] = useState<Shift | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'BARTENDER' | 'BARBACK'>(
    'BARTENDER'
  );
  const [selectedIsLead, setSelectedIsLead] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Array<{
      field: string;
      message: string;
      suggestion: string;
      violationType?: string;
    }>
  >([]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedTradeReceiver, setSelectedTradeReceiver] = useState('');
  const [tradeReason, setTradeReason] = useState('');
  const [trading, setTrading] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmounts, setTipAmounts] = useState<Record<string, string>>({});
  const [savingTips, setSavingTips] = useState(false);
  const [publishingTips, setPublishingTips] = useState(false);

  const shiftId = params.id as string;
  const isManager =
    session?.user?.role === 'MANAGER' || session?.user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch shift details
        const shiftRes = await fetch(`/api/shifts/${shiftId}`);
        if (!shiftRes.ok) {
          throw new Error('Failed to fetch shift');
        }
        const shiftData = await shiftRes.json();
        setShift(shiftData);

        // Fetch available users (bartenders and barbacks)
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setAvailableUsers(
            usersData.filter(
              (u: User) => u.role === 'BARTENDER' || u.role === 'BARBACK'
            )
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shift');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, shiftId]);

  async function handleAssignUser() {
    if (!selectedUserId) return;

    setAssigning(true);
    setError('');
    setValidationErrors([]);

    try {
      const response = await fetch(`/api/shifts/${shiftId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole,
          isLead: selectedIsLead,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.errors) {
          // Store validation errors and offer override option
          setValidationErrors(data.errors);
          setError(
            'Validation failed. You can request an override to proceed.'
          );
          setAssigning(false);
          return;
        }
        throw new Error(data.error || 'Failed to assign user');
      }

      // Refresh shift data
      const shiftRes = await fetch(`/api/shifts/${shiftId}`);
      const shiftData = await shiftRes.json();
      setShift(shiftData);

      setShowAssignModal(false);
      setSelectedUserId('');
      setSelectedRole('BARTENDER');
      setSelectedIsLead(false);
      setValidationErrors([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign user');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRequestOverride() {
    if (!overrideReason.trim()) {
      alert('Please provide a reason for the override');
      return;
    }

    setAssigning(true);
    setError('');

    try {
      // Get the first validation error's violation type
      const violationType =
        validationErrors[0]?.violationType || 'double_booking';

      // Create override request
      const overrideResponse = await fetch('/api/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shiftId,
          userId: selectedUserId,
          reason: overrideReason,
          violationType,
        }),
      });

      if (!overrideResponse.ok) {
        throw new Error('Failed to create override request');
      }

      const override = await overrideResponse.json();

      // Show success message
      alert(
        'Override request created. The staff member will be notified to approve or decline.'
      );

      setShowAssignModal(false);
      setShowOverrideModal(false);
      setSelectedUserId('');
      setSelectedRole('BARTENDER');
      setSelectedIsLead(false);
      setValidationErrors([]);
      setOverrideReason('');

      // Refresh to show the override
      router.push('/overrides');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to request override'
      );
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/shifts/${shiftId}/assignments/${assignmentId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove assignment');
      }

      // Refresh shift data
      const shiftRes = await fetch(`/api/shifts/${shiftId}`);
      const shiftData = await shiftRes.json();
      setShift(shiftData);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove assignment');
    }
  }

  async function handleProposeTradeClick() {
    // Check if user is assigned to this shift
    if (!shift) return;

    const userAssignment = shift.assignments.find(
      (a) => a.user.id === session?.user?.id
    );

    if (!userAssignment) {
      alert('You are not assigned to this shift');
      return;
    }

    setShowTradeModal(true);
  }

  async function handleProposeTrade() {
    if (!selectedTradeReceiver) {
      alert('Please select someone to trade with');
      return;
    }

    setTrading(true);
    setError('');

    try {
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shiftId,
          receiverId: selectedTradeReceiver,
          reason: tradeReason || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.errors) {
          const errorMessages = data.errors.join(', ');
          throw new Error(errorMessages);
        }
        throw new Error(data.error || 'Failed to propose trade');
      }

      alert('Trade proposal sent! The other staff member will be notified.');
      setShowTradeModal(false);
      setSelectedTradeReceiver('');
      setTradeReason('');
      router.push('/trades');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to propose trade');
    } finally {
      setTrading(false);
    }
  }

  function handleOpenTipModal() {
    if (!shift) return;

    // Initialize tip amounts with existing values
    const initialAmounts: Record<string, string> = {};
    shift.assignments.forEach((assignment) => {
      initialAmounts[assignment.id] = assignment.tipAmount
        ? String(assignment.tipAmount)
        : '';
    });
    setTipAmounts(initialAmounts);
    setShowTipModal(true);
  }

  async function handleSaveTips() {
    if (!shift) return;

    setSavingTips(true);
    setError('');

    try {
      const tips = shift.assignments.map((assignment) => ({
        assignmentId: assignment.id,
        amount: parseFloat(tipAmounts[assignment.id] || '0'),
      }));

      const response = await fetch(`/api/shifts/${shiftId}/tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tips }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save tips');
      }

      const result = await response.json();
      setShift({ ...shift, assignments: result.assignments });
      alert('Tips saved successfully!');
      setShowTipModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tips');
    } finally {
      setSavingTips(false);
    }
  }

  async function handlePublishTips() {
    if (!shift) return;

    setPublishingTips(true);
    setError('');

    try {
      const response = await fetch(`/api/shifts/${shiftId}/tips/publish`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to publish tips');
      }

      const result = await response.json();
      setShift({ ...shift, ...result.shift });
      alert('Tips published successfully! Staff have been notified.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish tips');
    } finally {
      setPublishingTips(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading shift...</p>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Shift not found</p>
          <button
            onClick={() => router.push('/shifts')}
            className="btn btn-primary"
          >
            Back to Shifts
          </button>
        </div>
      </div>
    );
  }

  const bartenderCount = shift.assignments.filter(
    (a) => a.role === 'BARTENDER'
  ).length;
  const barbackCount = shift.assignments.filter(
    (a) => a.role === 'BARBACK'
  ).length;
  const leadCount = shift.assignments.filter((a) => a.isLead).length;

  const isFullyStaffed =
    bartenderCount >= shift.bartendersRequired &&
    barbackCount >= shift.barbacksRequired &&
    leadCount >= shift.leadsRequired;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Shift Details</h1>
              <p className="text-sm text-muted-foreground">
                {shift.venue.name} -{' '}
                {new Date(shift.date).toLocaleDateString('default', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <button
              onClick={() => router.push('/shifts')}
              className="btn btn-outline"
            >
              Back to Shifts
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Shift Info */}
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="text-xl font-semibold">Shift Information</h2>
          </div>
          <div className="card-content">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">Time</dt>
                <dd className="text-lg font-medium">
                  {shift.startTime} - {shift.endTime}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd>
                  {isFullyStaffed ? (
                    <span className="badge badge-success">Fully Staffed</span>
                  ) : (
                    <span className="badge badge-warning">Needs Staff</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Bartenders</dt>
                <dd className="text-lg font-medium">
                  {bartenderCount} / {shift.bartendersRequired}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Barbacks</dt>
                <dd className="text-lg font-medium">
                  {barbackCount} / {shift.barbacksRequired}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Leads</dt>
                <dd className="text-lg font-medium">
                  {leadCount} / {shift.leadsRequired}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-6" role="alert">
            {error}
          </div>
        )}

        {/* Missing Tip Entry Warning */}
        {isManager &&
          shift.venue.tipPoolEnabled &&
          shift.assignments.length > 0 &&
          !shift.tipsPublished &&
          (() => {
            const assignmentsWithoutTips = shift.assignments.filter(
              (a) => a.tipAmount === null || a.tipAmount === undefined
            );
            return assignmentsWithoutTips.length > 0 ? (
              <div className="alert alert-warning mb-6" role="alert">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold mb-1">Missing Tip Entries</p>
                    <p className="text-sm mb-2">
                      {assignmentsWithoutTips.length} assignment
                      {assignmentsWithoutTips.length !== 1 ? 's' : ''} still
                      need tip amounts entered:
                    </p>
                    <ul className="text-sm list-disc list-inside mb-3 space-y-1">
                      {assignmentsWithoutTips.map((assignment) => (
                        <li key={assignment.id}>
                          {assignment.user.name} ({assignment.role}
                          {assignment.isLead && ' - Lead'})
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleOpenTipModal}
                      className="btn btn-sm btn-primary"
                    >
                      Enter Tips Now
                    </button>
                  </div>
                </div>
              </div>
            ) : null;
          })()}

        {/* Assignments */}
        <div className="card mb-6">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Staff Assignments</h2>
              <div className="flex gap-2">
                {!isManager &&
                  shift.assignments.some(
                    (a) => a.user.id === session?.user?.id
                  ) && (
                    <button
                      onClick={handleProposeTradeClick}
                      className="btn btn-outline"
                    >
                      Trade This Shift
                    </button>
                  )}
                {isManager && (
                  <>
                    {shift.venue.tipPoolEnabled &&
                      shift.assignments.length > 0 && (
                        <>
                          <button
                            onClick={handleOpenTipModal}
                            className="btn btn-outline"
                          >
                            Enter Tips
                          </button>
                          {shift.assignments.some(
                            (a) =>
                              a.tipAmount !== null && a.tipAmount !== undefined
                          ) &&
                            !shift.tipsPublished && (
                              <button
                                onClick={handlePublishTips}
                                className="btn btn-primary"
                                disabled={publishingTips}
                                title="Publish tips to make them visible to staff"
                              >
                                {publishingTips
                                  ? 'Publishing...'
                                  : 'Publish Tips'}
                              </button>
                            )}
                          {shift.tipsPublished && (
                            <span className="badge badge-success">
                              Tips Published
                            </span>
                          )}
                        </>
                      )}
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="btn btn-primary"
                    >
                      Assign Staff
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="card-content">
            {shift.assignments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No staff assigned yet
              </p>
            ) : (
              <div className="space-y-2">
                {shift.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{assignment.user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {assignment.user.email}
                      </div>
                      {shift.venue.tipPoolEnabled && assignment.tipAmount && (
                        <div className="text-sm text-success mt-1">
                          Tip: ${Number(assignment.tipAmount).toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-info">
                        {assignment.role}
                      </span>
                      {assignment.isLead && (
                        <span className="badge badge-success">Lead</span>
                      )}
                      {isManager && (
                        <button
                          onClick={() => handleRemoveAssignment(assignment.id)}
                          className="btn btn-outline text-destructive hover:bg-destructive hover:text-destructive-foreground text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assign Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Assign Staff</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="user" className="form-label">
                    Select Staff Member
                  </label>
                  <select
                    id="user"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">-- Select User --</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.role}
                        {user.isLead ? ' (Lead)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="role" className="form-label">
                    Role for this Shift
                  </label>
                  <select
                    id="role"
                    value={selectedRole}
                    onChange={(e) =>
                      setSelectedRole(e.target.value as 'BARTENDER' | 'BARBACK')
                    }
                    className="input w-full"
                  >
                    <option value="BARTENDER">Bartender</option>
                    <option value="BARBACK">Barback</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isLead"
                    checked={selectedIsLead}
                    onChange={(e) => setSelectedIsLead(e.target.checked)}
                    className="checkbox"
                  />
                  <label htmlFor="isLead" className="cursor-pointer">
                    Assign as lead for this shift
                  </label>
                </div>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                    Validation Issues
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {validationErrors.map((err, idx) => (
                      <li
                        key={idx}
                        className="text-yellow-600 dark:text-yellow-400"
                      >
                        • {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setError('');
                    setValidationErrors([]);
                  }}
                  className="btn btn-outline"
                  disabled={assigning}
                >
                  Cancel
                </button>
                {validationErrors.length > 0 ? (
                  <button
                    onClick={() => setShowOverrideModal(true)}
                    className="btn btn-warning"
                    disabled={assigning}
                  >
                    Request Override
                  </button>
                ) : (
                  <button
                    onClick={handleAssignUser}
                    className="btn btn-primary"
                    disabled={!selectedUserId || assigning}
                  >
                    {assigning ? 'Assigning...' : 'Assign'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Override Request Modal */}
        {showOverrideModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Request Override</h3>

              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-4">
                  This assignment violates scheduling rules. Please provide a
                  reason for the override. The staff member will need to approve
                  this request.
                </p>

                <label htmlFor="overrideReason" className="form-label">
                  Reason for Override{' '}
                  <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="overrideReason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={4}
                  className="input w-full"
                  placeholder="Explain why this override is necessary..."
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowOverrideModal(false);
                    setOverrideReason('');
                  }}
                  className="btn btn-outline"
                  disabled={assigning}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestOverride}
                  className="btn btn-warning"
                  disabled={assigning}
                >
                  {assigning ? 'Requesting...' : 'Request Override'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trade Modal */}
        {showTradeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Trade This Shift</h3>

              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Select a staff member to propose this trade to. They must
                  accept, and then a manager must approve the trade.
                </p>

                <label htmlFor="tradeReceiver" className="form-label">
                  Trade With <span className="text-destructive">*</span>
                </label>
                <select
                  id="tradeReceiver"
                  value={selectedTradeReceiver}
                  onChange={(e) => setSelectedTradeReceiver(e.target.value)}
                  className="input w-full"
                >
                  <option value="">-- Select Staff Member --</option>
                  {availableUsers
                    .filter((u) => u.id !== session?.user?.id)
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.role}
                        {user.isLead ? ' (Lead)' : ''}
                      </option>
                    ))}
                </select>

                <label htmlFor="tradeReason" className="form-label mt-4">
                  Reason (Optional)
                </label>
                <textarea
                  id="tradeReason"
                  value={tradeReason}
                  onChange={(e) => setTradeReason(e.target.value)}
                  rows={3}
                  className="input w-full"
                  placeholder="Why do you want to trade this shift?"
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowTradeModal(false);
                    setSelectedTradeReceiver('');
                    setTradeReason('');
                    setError('');
                  }}
                  className="btn btn-outline"
                  disabled={trading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleProposeTrade}
                  className="btn btn-primary"
                  disabled={!selectedTradeReceiver || trading}
                >
                  {trading ? 'Proposing...' : 'Propose Trade'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tip Entry Modal */}
        {showTipModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">Enter Tips</h3>

              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Enter tip amounts for each staff member who worked this shift.
                </p>

                <div className="space-y-3">
                  {shift?.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{assignment.user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.role}
                          {assignment.isLead && ' (Lead)'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tipAmounts[assignment.id] || ''}
                          onChange={(e) =>
                            setTipAmounts({
                              ...tipAmounts,
                              [assignment.id]: e.target.value,
                            })
                          }
                          className="input w-32"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-accent">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total:</span>
                    <span className="text-xl font-bold">
                      $
                      {Object.values(tipAmounts)
                        .reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowTipModal(false);
                    setError('');
                  }}
                  className="btn btn-outline"
                  disabled={savingTips}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTips}
                  className="btn btn-primary"
                  disabled={savingTips}
                >
                  {savingTips ? 'Saving...' : 'Save Tips'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
