'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';
import { Breadcrumb } from '@/components/breadcrumb';
import { Toast } from '@/components/toast';
import { formatTime12Hour } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isLead: boolean;
  preferredVenuesOrder?: string[];
}

interface ShiftAssignment {
  id: string;
  user: User;
  role: string;
  isLead: boolean;
  isOnCall?: boolean;
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
  eventName?: string | null;
  tipsPublished: boolean;
  tipsPublishedAt?: string | null;
  tipsPublishedBy?: string | null;
  upForTrade: boolean;
  upForTradeAt?: string | null;
  upForTradeBy?: string | null;
  upForTradeReason?: string | null;
  venue: {
    id: string;
    name: string;
    tipPoolEnabled: boolean;
    isNetworked: boolean;
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
  const [success, setSuccess] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'BARTENDER' | 'BARBACK'>(
    'BARTENDER'
  );
  const [selectedIsLead, setSelectedIsLead] = useState(false);

  // Update role and lead checkbox when user is selected
  useEffect(() => {
    if (selectedUserId) {
      const selectedUser = availableUsers.find((u) => u.id === selectedUserId);
      if (selectedUser) {
        // Auto-set role based on user's default role
        setSelectedRole(selectedUser.role as 'BARTENDER' | 'BARBACK');
        // Reset lead checkbox when changing users
        setSelectedIsLead(false);
      }
    }
  }, [selectedUserId, availableUsers]);
  const [assigning, setAssigning] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
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
  const [puttingUpForTrade, setPuttingUpForTrade] = useState(false);
  const [tradeReason, setTradeReason] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [totalTipPool, setTotalTipPool] = useState<string>('');
  const [savingTips, setSavingTips] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShift, setEditingShift] = useState(false);
  const [venues, setVenues] = useState<
    Array<{ id: string; name: string; managers?: Array<{ id: string }> }>
  >([]);
  const [availableVenues, setAvailableVenues] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [editFormData, setEditFormData] = useState({
    venueId: '',
    date: '',
    startTime: '',
    eventName: '',
    bartendersRequired: '',
    barbacksRequired: '',
    leadsRequired: '',
    tipAmount: '',
  });

  // Handle params which might be a Promise in Next.js App Router
  const shiftId =
    typeof params.id === 'string' ? params.id : params.id?.[0] || '';
  const userRole = session?.user?.role as string | undefined;
  const isManager =
    userRole === 'MANAGER' ||
    userRole === 'GENERAL_MANAGER' ||
    userRole === 'SUPER_ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isStaff = userRole === 'BARTENDER' || userRole === 'BARBACK';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch shift details
        if (!shiftId) {
          setError('Invalid shift ID');
          setLoading(false);
          return;
        }

        console.log('Fetching shift with ID:', shiftId);

        try {
          const shiftRes = await fetch(`/api/shifts/${shiftId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies for auth
          });
          console.log('Shift fetch response status:', shiftRes.status);

          if (!shiftRes.ok) {
            let errorData;
            try {
              errorData = await shiftRes.json();
            } catch {
              errorData = {
                error: `HTTP ${shiftRes.status}: ${shiftRes.statusText}`,
              };
            }
            console.error('Shift fetch error:', errorData);
            console.error('Full error response:', {
              status: shiftRes.status,
              statusText: shiftRes.statusText,
              error: errorData,
            });
            throw new Error(
              errorData.error || `Failed to fetch shift (${shiftRes.status})`
            );
          }

          const shiftData = await shiftRes.json();
          console.log('Shift data received:', shiftData);

          if (!shiftData || !shiftData.id) {
            console.error('Invalid shift data:', shiftData);
            throw new Error('Shift not found');
          }

          setShift(shiftData);

          // Initialize edit form with current shift data
          if (shiftData) {
            const shiftDate = new Date(shiftData.date);
            const tipAmount =
              shiftData.assignments &&
              shiftData.assignments.length > 0 &&
              shiftData.assignments[0].tipAmount
                ? Number(shiftData.assignments[0].tipAmount).toFixed(2)
                : '';
            setEditFormData({
              venueId: shiftData.venue.id,
              date: shiftDate.toISOString().split('T')[0],
              startTime: shiftData.startTime,
              eventName: shiftData.eventName || '',
              bartendersRequired: String(shiftData.bartendersRequired || 0),
              barbacksRequired: String(shiftData.barbacksRequired || 0),
              leadsRequired: String(shiftData.leadsRequired || 0),
              tipAmount: tipAmount,
            });
          }

          // Fetch venues
          const venuesRes = await fetch('/api/venues');
          if (venuesRes.ok) {
            const venuesData = await venuesRes.json();
            setVenues(venuesData);

            // Filter venues based on user permissions
            if (isSuperAdmin) {
              // Super admins can see all venues
              setAvailableVenues(venuesData);
            } else if (isManager) {
              // Managers can only see venues they manage
              const managedVenues = venuesData.filter(
                (venue: { managers?: Array<{ id: string }> }) =>
                  venue.managers?.some(
                    (manager) => manager.id === session?.user?.id
                  )
              );
              setAvailableVenues(managedVenues);
            } else {
              // Regular staff see no venues for editing
              setAvailableVenues([]);
            }
          }

          // Fetch available users (only if manager - for assigning staff)
          // Filter to only include users who work at this venue
          if (isManager && shiftData.venue) {
            const usersRes = await fetch('/api/users');
            if (usersRes.ok) {
              const usersData = await usersRes.json();
              setAvailableUsers(
                usersData.filter(
                  (u: User) =>
                    (u.role === 'BARTENDER' || u.role === 'BARBACK') &&
                    // Check if user has this venue in their preferred venues
                    u.preferredVenuesOrder &&
                    Array.isArray(u.preferredVenuesOrder) &&
                    u.preferredVenuesOrder.includes(shiftData.venue.id)
                )
              );
            }
          }
        } catch (fetchError) {
          // Handle network errors or other fetch failures
          console.error('Fetch error:', fetchError);
          if (fetchError instanceof Error) {
            throw fetchError;
          }
          throw new Error('Network error: Could not connect to server');
        }
      } catch (err) {
        console.error('Error in fetchData:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load shift';
        setError(errorMessage);
        setShift(null); // Ensure shift is null on error
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, shiftId, isManager, isSuperAdmin, session?.user?.id]);

  async function handleAssignUser() {
    if (!selectedUserId) return;

    setAssigning(true);
    setError('');
    setValidationErrors([]);

    try {
      // For super admins, allow bypassing validation
      const requestBody: any = {
        userId: selectedUserId,
        role: selectedRole,
        isLead: selectedIsLead,
      };

      // First attempt - validate normally
      let response = await fetch(`/api/shifts/${shiftId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.errors) {
          // Store validation errors
          setValidationErrors(data.errors);

          // For super admins, automatically retry with bypass
          if (isSuperAdmin) {
            requestBody.bypassValidation = true;
            response = await fetch(`/api/shifts/${shiftId}/assignments`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              const retryData = await response.json();
              throw new Error(
                retryData.error || 'Failed to assign user even with bypass'
              );
            }
          } else {
            // For non-super admins, show override option
            setError(
              'Validation failed. You can request an override to proceed.'
            );
            setAssigning(false);
            return;
          }
        } else {
          throw new Error(data.error || 'Failed to assign user');
        }
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
      setError('');
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

  async function handleToggleOnCall(assignmentId: string) {
    if (!shift) return;

    try {
      const assignment = shift.assignments.find((a) => a.id === assignmentId);
      if (!assignment) return;

      const response = await fetch(
        `/api/shifts/${shiftId}/assignments/${assignmentId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isOnCall: !assignment.isOnCall,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update on-call status');
      }

      const updatedAssignment = await response.json();

      // Refresh shift data
      const shiftRes = await fetch(`/api/shifts/${shiftId}`);
      const shiftData = await shiftRes.json();
      setShift(shiftData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update on-call status'
      );
    }
  }

  async function handleAutoAssign() {
    if (!shift) return;

    setAutoAssigning(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/shifts/${shiftId}/auto-assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to auto-assign staff');
      }

      const result = await response.json();

      // Refresh shift data
      const shiftRes = await fetch(`/api/shifts/${shiftId}`);
      const shiftData = await shiftRes.json();
      setShift(shiftData);

      if (result.assigned > 0) {
        setSuccess(
          `Auto-assigned ${result.assigned} staff member(s)! ${result.summary?.leadsAssigned || 0} lead(s), ${result.summary?.bartendersAssigned || 0} bartender(s), ${result.summary?.barbacksAssigned || 0} barback(s).`
        );
      } else {
        setError(
          'No additional staff could be auto-assigned. All eligible staff may already be assigned or unavailable.'
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to auto-assign staff'
      );
    } finally {
      setAutoAssigning(false);
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

  async function handleUpdateShift() {
    if (!shift) return;

    setEditingShift(true);
    setError('');

    try {
      // Update shift details - convert string values to numbers
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          venueId: editFormData.venueId,
          date: editFormData.date,
          startTime: editFormData.startTime,
          eventName: editFormData.eventName.trim(),
          bartendersRequired: parseInt(editFormData.bartendersRequired) || 0,
          barbacksRequired: parseInt(editFormData.barbacksRequired) || 0,
          leadsRequired: parseInt(editFormData.leadsRequired) || 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to update shift' }));
        throw new Error(errorData.error || 'Failed to update shift');
      }

      // If tip pool is enabled and tip amount is provided, save tips
      if (
        shift.venue.tipPoolEnabled &&
        shift.assignments.length > 0 &&
        editFormData.tipAmount
      ) {
        const perPersonAmount = parseFloat(editFormData.tipAmount);
        if (perPersonAmount >= 0) {
          const tipsResponse = await fetch(`/api/shifts/${shiftId}/tips`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ perPersonAmount }),
          });

          if (!tipsResponse.ok) {
            const tipsError = await tipsResponse
              .json()
              .catch(() => ({ error: 'Failed to save tips' }));
            throw new Error(tipsError.error || 'Failed to save tips');
          }
        }
      }

      // Refresh shift data
      const shiftRes = await fetch(`/api/shifts/${shiftId}`);
      const shiftData = await shiftRes.json();
      setShift(shiftData);

      setShowEditModal(false);
      setSuccess('Shift updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shift');
    } finally {
      setEditingShift(false);
    }
  }

  async function handleDeleteShift() {
    if (!shift) return;

    if (
      !confirm(
        `Are you sure you want to delete this shift? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to delete shift' }));
        throw new Error(errorData.error || 'Failed to delete shift');
      }

      router.push('/shifts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete shift');
    }
  }

  async function handlePutUpForTrade() {
    if (!shift || !session?.user?.id) return;

    const userAssignment = shift.assignments.find(
      (a) => a.user.id === session.user.id
    );

    if (!userAssignment) {
      alert('You are not assigned to this shift');
      return;
    }

    if (shift.upForTrade) {
      alert('This shift is already up for trade');
      return;
    }

    // Optional: Show a simple prompt for reason
    const reason = prompt(
      'Optional: Why are you putting this shift up for trade?'
    );

    setPuttingUpForTrade(true);
    setError('');

    try {
      const response = await fetch(`/api/shifts/${shiftId}/put-up-for-trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to put shift up for trade');
      }

      const updatedShift = await response.json();
      setShift(updatedShift);

      alert(
        'Shift is now up for trade! Eligible staff and managers have been notified.'
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to put shift up for trade'
      );
    } finally {
      setPuttingUpForTrade(false);
    }
  }

  function handleOpenTipModal() {
    if (!shift) return;

    // Get the per-person amount (should be the same for all if set)
    const perPersonAmount =
      shift.assignments.length > 0 && shift.assignments[0].tipAmount
        ? Number(shift.assignments[0].tipAmount)
        : 0;

    setTotalTipPool(perPersonAmount > 0 ? perPersonAmount.toFixed(2) : '');
    setShowTipModal(true);
  }

  async function handleSaveTips() {
    if (!shift) return;

    setSavingTips(true);
    setError('');

    try {
      const perPersonAmount = parseFloat(totalTipPool || '0');

      if (perPersonAmount < 0) {
        throw new Error('Tip amount cannot be negative');
      }

      if (shift.assignments.length === 0) {
        throw new Error('No staff assigned to this shift');
      }

      const response = await fetch(`/api/shifts/${shiftId}/tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ perPersonAmount }),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading shift...</p>
      </div>
    );
  }

  if (!shift && !loading) {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-2 text-lg font-semibold">
              {error || 'Shift not found'}
            </p>
            {error && (
              <p className="text-gray-400 mb-4 text-sm">Shift ID: {shiftId}</p>
            )}
            <button
              onClick={() =>
                router.push(
                  isManager || isSuperAdmin ? '/shifts' : '/dashboard'
                )
              }
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-500 hover:to-blue-500 transition-all"
            >
              {isManager || isSuperAdmin
                ? 'Back to Shifts'
                : 'Back to Dashboard'}
            </button>
          </div>
        </div>
      </PremiumLayout>
    );
  }

  if (!shift) {
    return null; // Still loading or error state
  }

  // Sort assignments: BARBACK first, then LEAD, then regular BARTENDER
  const sortedAssignments = [...shift.assignments].sort((a, b) => {
    // Barbacks first
    if (a.role === 'BARBACK' && b.role !== 'BARBACK') return -1;
    if (a.role !== 'BARBACK' && b.role === 'BARBACK') return 1;

    // Then leads
    if (a.isLead && !b.isLead) return -1;
    if (!a.isLead && b.isLead) return 1;

    // Then regular bartenders
    return 0;
  });

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

  function getStaffingViolations() {
    if (!shift) return [];
    const violations: string[] = [];

    if (shift.assignments.length === 0) {
      violations.push('No staff assigned');
      return violations;
    }

    if (bartenderCount < shift.bartendersRequired) {
      violations.push(
        `Missing ${shift.bartendersRequired - bartenderCount} bartender${shift.bartendersRequired - bartenderCount !== 1 ? 's' : ''}`
      );
    }
    if (barbackCount < shift.barbacksRequired) {
      violations.push(
        `Missing ${shift.barbacksRequired - barbackCount} barback${shift.barbacksRequired - barbackCount !== 1 ? 's' : ''}`
      );
    }
    if (leadCount < shift.leadsRequired) {
      violations.push(
        `Missing ${shift.leadsRequired - leadCount} lead${shift.leadsRequired - leadCount !== 1 ? 's' : ''}`
      );
    }

    return violations;
  }

  const staffingViolations = getStaffingViolations();
  const hasViolations = staffingViolations.length > 0;

  return (
    <PremiumLayout>
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent truncate">
                  {shift.eventName || 'Shift Details'}
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-400 truncate">
                  {shift.venue.name} •{' '}
                  {new Date(shift.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' • '}
                  {formatTime12Hour(shift.startTime)}
                </p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() =>
                    router.push(isManager ? '/shifts' : '/dashboard')
                  }
                  className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 font-medium hover:bg-gray-800 transition-all text-xs sm:text-sm min-h-[44px] touch-manipulation"
                  aria-label="Go back"
                >
                  <span className="hidden sm:inline">Back</span>
                  <span className="sm:hidden">←</span>
                </button>
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Toast Messages */}
          {error && (
            <Toast message={error} type="error" onClose={() => setError('')} />
          )}
          {success && (
            <Toast
              message={success}
              type="success"
              onClose={() => setSuccess('')}
            />
          )}

          {/* Breadcrumbs */}
          {shift && (
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                ...(isManager || isSuperAdmin
                  ? [{ label: 'Shift Scheduler', href: '/shifts' }]
                  : []),
              ]}
              currentLabel={
                shift.eventName
                  ? `${shift.eventName} - ${new Date(shift.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : 'Shift Details'
              }
            />
          )}

          {/* Shift Info */}
          <PremiumCard className="mb-3">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-semibold text-gray-100">
                  Shift Information
                </h2>
                {isManager && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-3 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-xs sm:text-sm min-h-[44px] touch-manipulation"
                    aria-label="Edit shift"
                  >
                    Edit
                  </button>
                )}
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {shift.eventName && (
                  <div>
                    <dt className="text-xs text-gray-400 mb-0.5">Event</dt>
                    <dd className="text-sm font-medium text-gray-100">
                      {shift.eventName}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Venue</dt>
                  <dd className="text-sm font-medium text-gray-100">
                    {shift.venue.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Date</dt>
                  <dd className="text-sm font-medium text-gray-100">
                    {new Date(shift.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
                {shift.venue.tipPoolEnabled && (
                  <div>
                    <dt className="text-xs text-gray-400 mb-0.5">Tip Pool</dt>
                    <dd className="text-sm font-medium text-gray-100">
                      {shift.assignments.length > 0 &&
                      shift.assignments.some(
                        (a) => a.tipAmount !== null && Number(a.tipAmount) > 0
                      ) ? (
                        `$${Number(shift.assignments[0].tipAmount || 0).toFixed(2)}/person`
                      ) : (
                        <span className="text-xs text-gray-400">
                          Not entered
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {isManager && (
                  <>
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Status</dt>
                      <dd>
                        {isFullyStaffed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                            ✓ Staffed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/40">
                            ⚠ {staffingViolations[0] || 'Action Needed'}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">
                        Bartenders
                      </dt>
                      <dd
                        className={`text-sm font-medium ${bartenderCount < shift.bartendersRequired ? 'text-red-400' : 'text-gray-100'}`}
                      >
                        {bartenderCount}/{shift.bartendersRequired}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Barbacks</dt>
                      <dd
                        className={`text-sm font-medium ${barbackCount < shift.barbacksRequired ? 'text-red-400' : 'text-gray-100'}`}
                      >
                        {barbackCount}/{shift.barbacksRequired}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Leads</dt>
                      <dd
                        className={`text-sm font-medium ${leadCount < shift.leadsRequired ? 'text-red-400' : 'text-gray-100'}`}
                      >
                        {leadCount}/{shift.leadsRequired}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          </PremiumCard>

          {/* Missing Tip Entry Warning - Compact */}
          {isManager &&
            shift.venue.tipPoolEnabled &&
            shift.assignments.length > 0 &&
            !shift.assignments.some(
              (a) =>
                a.tipAmount !== null &&
                a.tipAmount !== undefined &&
                Number(a.tipAmount) > 0
            ) && (
              <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg flex items-center justify-between">
                <span className="text-xs">⚠️ Tips not entered</span>
                <button
                  onClick={handleOpenTipModal}
                  className="px-3 py-1 rounded bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold hover:from-purple-500 hover:to-blue-500 transition-all"
                >
                  Enter Tips
                </button>
              </div>
            )}

          {/* Shift Actions for Staff - Compact */}
          {!isManager &&
            shift.assignments.some((a) => a.user.id === session?.user?.id) && (
              <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-between">
                <span className="text-xs text-blue-400">
                  {shift.upForTrade ? 'Up for trade' : 'Put shift up for trade'}
                </span>
                {!shift.upForTrade && (
                  <button
                    onClick={handlePutUpForTrade}
                    className="px-3 py-1 rounded border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
                  >
                    Trade
                  </button>
                )}
              </div>
            )}

          {/* Staff Assignments - Only for Managers */}
          {isManager && (
            <PremiumCard className="mb-3">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-foreground dark:text-gray-100">
                    Staff Assignments
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAutoAssign}
                      disabled={autoAssigning}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-500 hover:to-blue-500 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {autoAssigning ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Auto-assigning...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          Auto Assign
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm"
                    >
                      + Assign Manually
                    </button>
                  </div>
                </div>
                {shift.assignments.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 mb-3">
                      <span className="text-sm">⚠️</span>
                      <span className="text-xs font-semibold">
                        No staff assigned
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <button
                        onClick={handleAutoAssign}
                        disabled={autoAssigning}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-500 hover:to-blue-500 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        {autoAssigning ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Auto-assigning...
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
                            </svg>
                            Auto Assign Staff
                          </>
                        )}
                      </button>
                      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                        <span>or</span>
                        <button
                          onClick={() => setShowAssignModal(true)}
                          className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs"
                        >
                          Assign Manually
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {sortedAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between py-2 px-2 rounded border border-border dark:border-gray-800 bg-muted/30 dark:bg-gray-800/20"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="font-medium text-sm text-foreground dark:text-gray-100 truncate">
                                {assignment.user.name}
                              </div>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                {assignment.role === 'BARTENDER' ? 'BT' : 'BB'}
                              </span>
                              {assignment.isLead && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20">
                                  Lead
                                </span>
                              )}
                              {assignment.isOnCall && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                                  OC
                                </span>
                              )}
                              {shift.venue.tipPoolEnabled &&
                                assignment.tipAmount && (
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    ${Number(assignment.tipAmount).toFixed(2)}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!assignment.isLead && (
                            <button
                              onClick={() => handleToggleOnCall(assignment.id)}
                              className={`px-1.5 py-0.5 rounded border font-medium text-xs flex-shrink-0 transition-all ${
                                assignment.isOnCall
                                  ? 'border-purple-700 dark:border-purple-800 bg-purple-50 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300'
                                  : 'border-gray-700 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:border-purple-500'
                              }`}
                              title={
                                assignment.isOnCall
                                  ? 'Mark as regular'
                                  : 'Mark as on-call'
                              }
                            >
                              {assignment.isOnCall ? 'OC' : 'OC'}
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleRemoveAssignment(assignment.id)
                            }
                            className="px-1.5 py-0.5 rounded border border-red-700 dark:border-red-800 bg-red-50 dark:bg-red-800/50 text-red-700 dark:text-red-300 font-medium text-xs flex-shrink-0"
                            title="Remove assignment"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PremiumCard>
          )}

          {/* Assign Modal */}
          {showAssignModal && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setShowAssignModal(false)}
            >
              <div
                className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      Assign Staff
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Add a staff member to this shift
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    disabled={assigning}
                  >
                    <svg
                      className="w-6 h-6"
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
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="user"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Select Staff Member{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="user"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                    >
                      <option value="">-- Select User --</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} - {user.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedUserId && (
                    <div>
                      <label
                        htmlFor="role"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Role for this Shift
                      </label>
                      <div className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 cursor-not-allowed">
                        {selectedRole === 'BARTENDER' ? 'Bartender' : 'Barback'}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Role is set based on staff member&apos;s default role
                      </p>
                    </div>
                  )}

                  {selectedUserId && selectedRole === 'BARTENDER' && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                      <input
                        type="checkbox"
                        id="isLead"
                        checked={selectedIsLead}
                        onChange={(e) => setSelectedIsLead(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                      />
                      <label
                        htmlFor="isLead"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                      >
                        Assign as lead for this shift
                      </label>
                    </div>
                  )}
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                    <h4 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2 text-sm">
                      Validation Issues
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {validationErrors.map((err, idx) => (
                        <li
                          key={idx}
                          className="text-yellow-600 dark:text-yellow-400"
                        >
                          • {err.message}
                          {err.suggestion && (
                            <span className="block text-xs text-yellow-500/80 dark:text-yellow-400/80 ml-4 mt-1">
                              → {err.suggestion}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedUserId('');
                      setSelectedRole('BARTENDER');
                      setSelectedIsLead(false);
                      setValidationErrors([]);
                      setError('');
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    disabled={assigning}
                  >
                    Cancel
                  </button>
                  {validationErrors.length > 0 && !isSuperAdmin ? (
                    <button
                      onClick={() => setShowOverrideModal(true)}
                      className="px-4 py-2 rounded-lg border border-yellow-600 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 font-semibold hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-all disabled:opacity-50"
                      disabled={assigning}
                    >
                      Request Override
                    </button>
                  ) : (
                    <button
                      onClick={handleAssignUser}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
                      disabled={!selectedUserId || assigning}
                    >
                      {assigning
                        ? 'Assigning...'
                        : isSuperAdmin && validationErrors.length > 0
                          ? 'Assign (Bypass Rules)'
                          : 'Assign Staff'}
                    </button>
                  )}
                  {validationErrors.length > 0 && isSuperAdmin && (
                    <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                      <p className="font-semibold mb-1">
                        ⚠️ Validation Issues Detected (Bypassed as Super Admin):
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((err, idx) => (
                          <li key={idx}>{err.message}</li>
                        ))}
                      </ul>
                    </div>
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
                    reason for the override. The staff member will need to
                    approve this request.
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

          {/* Edit Shift Modal */}
          {showEditModal && shift && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => {
                setShowEditModal(false);
                setError('');
                if (shift) {
                  const shiftDate = new Date(shift.date);
                  const tipAmount =
                    shift.assignments &&
                    shift.assignments.length > 0 &&
                    shift.assignments[0].tipAmount
                      ? Number(shift.assignments[0].tipAmount).toFixed(2)
                      : '';
                  setEditFormData({
                    venueId: shift.venue.id,
                    date: shiftDate.toISOString().split('T')[0],
                    startTime: shift.startTime,
                    eventName: shift.eventName || '',
                    bartendersRequired: String(shift.bartendersRequired || 0),
                    barbacksRequired: String(shift.barbacksRequired || 0),
                    leadsRequired: String(shift.leadsRequired || 0),
                    tipAmount: tipAmount,
                  });
                }
              }}
            >
              <div
                className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      Edit Shift
                    </h3>
                    {shift.eventName && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {shift.eventName}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setError('');
                      if (shift) {
                        const shiftDate = new Date(shift.date);
                        const tipAmount =
                          shift.assignments &&
                          shift.assignments.length > 0 &&
                          shift.assignments[0].tipAmount
                            ? Number(shift.assignments[0].tipAmount).toFixed(2)
                            : '';
                        setEditFormData({
                          venueId: shift.venue.id,
                          date: shiftDate.toISOString().split('T')[0],
                          startTime: shift.startTime,
                          eventName: shift.eventName || '',
                          bartendersRequired: String(
                            shift.bartendersRequired || 0
                          ),
                          barbacksRequired: String(shift.barbacksRequired || 0),
                          leadsRequired: String(shift.leadsRequired || 0),
                          tipAmount: tipAmount,
                        });
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    disabled={editingShift}
                  >
                    <svg
                      className="w-6 h-6"
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
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Shift Details Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Shift Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label
                          htmlFor="editEventName"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                        >
                          Event/Concert Name{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="editEventName"
                          value={editFormData.eventName}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              eventName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                          placeholder="Enter event or concert name"
                          required
                          disabled={editingShift}
                        />
                      </div>
                      {isManager && (
                        <div>
                          <label
                            htmlFor="editVenue"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                          >
                            Venue <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="editVenue"
                            value={editFormData.venueId}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                venueId: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                            required
                            disabled={editingShift}
                          >
                            {availableVenues.length === 0 ? (
                              <option value="">No venues available</option>
                            ) : (
                              availableVenues.map((venue) => (
                                <option key={venue.id} value={venue.id}>
                                  {venue.name}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="editDate"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                        >
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="editDate"
                          value={editFormData.date}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              date: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                          required
                          disabled={editingShift}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="editStartTime"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                        >
                          Start Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          id="editStartTime"
                          value={editFormData.startTime}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              startTime: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                          required
                          disabled={editingShift}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Staffing Requirements Section */}
                  <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                      Staffing Requirements
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label
                          htmlFor="editBartendersRequired"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                        >
                          Bartenders
                        </label>
                        <input
                          type="number"
                          id="editBartendersRequired"
                          min="0"
                          step="1"
                          value={editFormData.bartendersRequired}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty string or valid number
                            if (
                              value === '' ||
                              (!isNaN(Number(value)) && Number(value) >= 0)
                            ) {
                              setEditFormData({
                                ...editFormData,
                                bartendersRequired:
                                  value === '' ? '' : String(Number(value)),
                              });
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="editBarbacksRequired"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                        >
                          Barbacks
                        </label>
                        <input
                          type="number"
                          id="editBarbacksRequired"
                          min="0"
                          step="1"
                          value={editFormData.barbacksRequired}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty string or valid number
                            if (
                              value === '' ||
                              (!isNaN(Number(value)) && Number(value) >= 0)
                            ) {
                              setEditFormData({
                                ...editFormData,
                                barbacksRequired:
                                  value === '' ? '' : String(Number(value)),
                              });
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="editLeadsRequired"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                        >
                          Leads
                        </label>
                        <input
                          type="number"
                          id="editLeadsRequired"
                          min="0"
                          step="1"
                          value={editFormData.leadsRequired}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty string or valid number
                            if (
                              value === '' ||
                              (!isNaN(Number(value)) && Number(value) >= 0)
                            ) {
                              setEditFormData({
                                ...editFormData,
                                leadsRequired:
                                  value === '' ? '' : String(Number(value)),
                              });
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tip Pool Section */}
                  {shift.venue.tipPoolEnabled &&
                    shift.assignments.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Tip Pool
                        </h4>
                        <div>
                          <label
                            htmlFor="editTipAmount"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                          >
                            Per Person Amount
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 dark:text-gray-400 text-sm">
                                $
                              </span>
                            </div>
                            <input
                              type="number"
                              id="editTipAmount"
                              min="0"
                              step="0.01"
                              value={editFormData.tipAmount}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  tipAmount: e.target.value,
                                })
                              }
                              className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0.00"
                              disabled={editingShift}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {error && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleDeleteShift}
                    className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={editingShift}
                  >
                    Delete Shift
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setError('');
                        if (shift) {
                          const shiftDate = new Date(shift.date);
                          const tipAmount =
                            shift.assignments &&
                            shift.assignments.length > 0 &&
                            shift.assignments[0].tipAmount
                              ? Number(shift.assignments[0].tipAmount).toFixed(
                                  2
                                )
                              : '';
                          setEditFormData({
                            venueId: shift.venue.id,
                            date: shiftDate.toISOString().split('T')[0],
                            startTime: shift.startTime,
                            eventName: shift.eventName || '',
                            bartendersRequired: String(
                              shift.bartendersRequired || 0
                            ),
                            barbacksRequired: String(
                              shift.barbacksRequired || 0
                            ),
                            leadsRequired: String(shift.leadsRequired || 0),
                            tipAmount: tipAmount,
                          });
                        }
                      }}
                      className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={editingShift}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateShift}
                      className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        editingShift ||
                        !editFormData.date ||
                        !editFormData.startTime ||
                        !editFormData.eventName.trim() ||
                        (isManager && !editFormData.venueId)
                      }
                    >
                      {editingShift ? 'Updating...' : 'Update Shift'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tip Entry Modal */}
          {showTipModal && shift && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => {
                setShowTipModal(false);
                setError('');
                setTotalTipPool('');
              }}
            >
              <div
                className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      Enter Tip Pool
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Enter the tip amount per person
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowTipModal(false);
                      setError('');
                      setTotalTipPool('');
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    disabled={savingTips}
                  >
                    <svg
                      className="w-6 h-6"
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
                  </button>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="totalTipPool"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Per Person Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400 text-lg">
                      $
                    </span>
                    <input
                      type="number"
                      id="totalTipPool"
                      min="0"
                      step="0.01"
                      value={totalTipPool}
                      onChange={(e) => setTotalTipPool(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowTipModal(false);
                      setError('');
                      setTotalTipPool('');
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    disabled={savingTips}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTips}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
                    disabled={
                      savingTips ||
                      !totalTipPool ||
                      parseFloat(totalTipPool) <= 0
                    }
                  >
                    {savingTips ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </PremiumLayout>
  );
}
