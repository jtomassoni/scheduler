'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { UserMenu } from '@/components/user-menu';
import Link from 'next/link';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { formatTime12Hour } from '@/lib/utils';
import { CreateShiftModal } from '@/components/create-shift-modal';

interface ManagerDashboardProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
}

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: {
    id: string;
    name: string;
  };
  assignments: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      role: string;
    };
    role: string;
    isLead: boolean;
  }>;
  bartendersRequired: number;
  barbacksRequired: number;
  leadsRequired: number;
  _count: {
    assignments: number;
  };
}

interface CompanyRequest {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  status: 'PENDING' | 'REVIEWED' | 'APPROVED' | 'DECLINED';
  createdAt: string;
}

interface Venue {
  id: string;
  name: string;
  managers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export function ManagerDashboard({ user }: ManagerDashboardProps) {
  const { data: session, status } = useSession();
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [weekShifts, setWeekShifts] = useState<Shift[]>([]);
  const [companyRequests, setCompanyRequests] = useState<CompanyRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [managedVenues, setManagedVenues] = useState<Venue[]>([]);
  const [venueStats, setVenueStats] = useState({
    totalVenues: 0,
    upcomingShifts: 0,
    totalShifts: 0,
  });

  async function fetchCompanyRequests() {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanyRequests(data);
      }
    } catch (error) {
      console.error('Error fetching company requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  }

  const fetchManagedVenues = useCallback(async () => {
    try {
      const response = await fetch('/api/venues');
      if (response.ok) {
        const allVenues = await response.json();
        // Filter to only venues managed by this user
        const myVenues = allVenues.filter((venue: Venue) => {
          const isManaged = venue.managers.some(
            (manager) => manager.id === user.id
          );
          if (!isManaged && venue.managers.length > 0) {
            console.log(
              `Venue ${venue.name} managers:`,
              venue.managers.map((m) => `${m.name} (${m.id})`)
            );
            console.log(`Current user ID: ${user.id}`);
          }
          return isManaged;
        });
        setManagedVenues(myVenues);

        // Debug logging
        console.log(
          'All venues:',
          allVenues.map((v: Venue) => v.name)
        );
        console.log(
          'Managed venues:',
          myVenues.map((v: Venue) => v.name)
        );
        console.log('User ID:', user.id);

        // Fetch stats for managed venues
        if (myVenues.length > 0) {
          const venueIds = myVenues.map((v: Venue) => v.id);
          const today = new Date();
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
          );

          // Fetch shifts for managed venues
          const shiftsResponse = await fetch(
            `/api/shifts?startDate=${monthStart.toISOString().split('T')[0]}&endDate=${monthEnd.toISOString().split('T')[0]}`
          );

          if (shiftsResponse.ok) {
            const allShifts = await shiftsResponse.json();
            const myShifts = allShifts.filter((shift: Shift) =>
              venueIds.includes(shift.venue.id)
            );
            const upcomingShifts = myShifts.filter(
              (shift: Shift) => new Date(shift.date) >= today
            );

            setVenueStats({
              totalVenues: myVenues.length,
              upcomingShifts: upcomingShifts.length,
              totalShifts: myShifts.length,
            });
          }
        } else {
          setVenueStats({
            totalVenues: 0,
            upcomingShifts: 0,
            totalShifts: 0,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching managed venues:', error);
    }
  }, [user.id]);

  useEffect(() => {
    async function fetchShifts() {
      if (status !== 'authenticated') return;

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        // Fetch today's shifts
        const todayParams = new URLSearchParams({
          startDate: today.toISOString().split('T')[0],
          endDate: tomorrow.toISOString().split('T')[0],
        });

        const todayResponse = await fetch(`/api/shifts?${todayParams}`);
        if (todayResponse.ok) {
          const todayData = await todayResponse.json();
          setTodayShifts(todayData);
        }

        // Fetch this week's shifts
        const weekParams = new URLSearchParams({
          startDate: today.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
        });

        const weekResponse = await fetch(`/api/shifts?${weekParams}`);
        if (weekResponse.ok) {
          const weekData = await weekResponse.json();
          setWeekShifts(weekData);
        }
      } catch (error) {
        console.error('Error fetching shifts:', error);
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchShifts();
      if (user.role === 'SUPER_ADMIN') {
        fetchCompanyRequests();
      }
      if (user.role === 'MANAGER' || user.role === 'GENERAL_MANAGER') {
        fetchManagedVenues();
      }
    }
  }, [status, user.role, user.id, fetchManagedVenues]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl+N to create new shift (only for managers)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === 'n' &&
        (user.role === 'MANAGER' || user.role === 'GENERAL_MANAGER')
      ) {
        e.preventDefault();
        setShowCreateModal(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user.role]);

  function isShiftFullyStaffed(shift: Shift): boolean {
    const bartenderCount = shift.assignments.filter(
      (a) => a.role === 'BARTENDER'
    ).length;
    const barbackCount = shift.assignments.filter(
      (a) => a.role === 'BARBACK'
    ).length;
    const leadCount = shift.assignments.filter((a) => a.isLead).length;

    return (
      bartenderCount >= shift.bartendersRequired &&
      barbackCount >= shift.barbacksRequired &&
      leadCount >= shift.leadsRequired
    );
  }

  function getStaffingViolations(shift: Shift): string[] {
    const violations: string[] = [];

    if (shift.assignments.length === 0) {
      violations.push('No staff assigned');
      return violations;
    }

    const bartenderCount = shift.assignments.filter(
      (a) => a.role === 'BARTENDER'
    ).length;
    const barbackCount = shift.assignments.filter(
      (a) => a.role === 'BARBACK'
    ).length;
    const leadCount = shift.assignments.filter((a) => a.isLead).length;

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

  function hasStaffingViolations(shift: Shift): boolean {
    return getStaffingViolations(shift).length > 0;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <PremiumLayout>
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Dashboard
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          {/* Super Admin CRM Section - Most Important */}
          {user.role === 'SUPER_ADMIN' && (
            <div className="mb-4">
              <PremiumCard className="border-purple-500/30 bg-gradient-to-br from-purple-50/50 dark:from-gray-900/50 to-purple-100/30 dark:to-purple-900/10">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                        Leads & Companies
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Manage leads and track active companies
                      </p>
                    </div>
                    <Link
                      href="/company-requests"
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 text-sm"
                    >
                      View All Leads →
                    </Link>
                  </div>

                  {requestsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Loading leads...
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Stats */}
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="text-center p-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50">
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                            {companyRequests.length}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Total Leads
                          </div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-300 dark:border-yellow-500/20">
                          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                            {
                              companyRequests.filter(
                                (r) => r.status === 'PENDING'
                              ).length
                            }
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Unreviewed
                          </div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/20">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                            {
                              companyRequests.filter(
                                (r) => r.status === 'REVIEWED'
                              ).length
                            }
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            In Progress
                          </div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-300 dark:border-green-500/20">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                            {
                              companyRequests.filter(
                                (r) => r.status === 'APPROVED'
                              ).length
                            }
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Active
                          </div>
                        </div>
                      </div>

                      {/* Recent Pending Requests */}
                      {companyRequests.filter((r) => r.status === 'PENDING')
                        .length > 0 && (
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Recent Unreviewed Leads
                          </h3>
                          <div className="space-y-2">
                            {companyRequests
                              .filter((r) => r.status === 'PENDING')
                              .slice(0, 3)
                              .map((request) => (
                                <Link
                                  key={request.id}
                                  href={`/company-requests?id=${request.id}`}
                                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-purple-500/30 transition-all group"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-0.5">
                                      {request.companyName}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                      {request.contactName} •{' '}
                                      {request.contactEmail}
                                    </div>
                                  </div>
                                  <div className="ml-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                      Unreviewed
                                    </span>
                                  </div>
                                  <svg
                                    className="w-4 h-4 text-gray-500 ml-3 group-hover:text-purple-400 group-hover:translate-x-1 transition-all"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </Link>
                              ))}
                          </div>
                          {companyRequests.filter((r) => r.status === 'PENDING')
                            .length > 3 && (
                            <div className="mt-3 text-center">
                              <Link
                                href="/company-requests"
                                className="text-purple-400 hover:text-purple-300 text-xs font-medium"
                              >
                                View{' '}
                                {companyRequests.filter(
                                  (r) => r.status === 'PENDING'
                                ).length - 3}{' '}
                                more unreviewed leads →
                              </Link>
                            </div>
                          )}
                        </div>
                      )}

                      {companyRequests.filter((r) => r.status === 'PENDING')
                        .length === 0 && (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            No pending leads at the moment
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </PremiumCard>
            </div>
          )}

          {/* Today's Shifts & This Week - Combined in Columns - Only for Managers/General Managers, not Super Admins */}
          {user.role !== 'SUPER_ADMIN' && (
            <div className="mb-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Today's Shifts */}
                <PremiumCard>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h2 className="text-base font-bold text-gray-100">
                          Today&apos;s Shifts
                        </h2>
                        <span className="text-[10px] font-medium text-gray-400">
                          {new Date().toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-2 py-1 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-[10px]"
                      >
                        + Create
                      </button>
                    </div>
                    {loading ? (
                      <div className="text-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mx-auto mb-1"></div>
                        <p className="text-xs text-gray-400">Loading...</p>
                      </div>
                    ) : todayShifts.length === 0 ? (
                      <div className="text-center py-3">
                        <p className="text-xs text-gray-400 mb-1.5">
                          No shifts scheduled for today
                        </p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-xs"
                        >
                          Create Shift
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {todayShifts.map((shift) => {
                          const hasViolations = hasStaffingViolations(shift);
                          const violations = getStaffingViolations(shift);
                          return (
                            <Link
                              key={shift.id}
                              href={`/shifts/${shift.id}`}
                              className={`block p-2 rounded-lg border transition-all group ${
                                hasViolations
                                  ? 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/70'
                                  : 'border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-purple-500/30'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <h3 className="text-sm font-semibold text-gray-100 truncate">
                                      {shift.venue.name}
                                    </h3>
                                    {hasViolations ? (
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/40 flex-shrink-0">
                                        ⚠
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20 flex-shrink-0">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  {hasViolations && (
                                    <div className="mb-1">
                                      {violations
                                        .slice(0, 1)
                                        .map((violation, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-block text-[10px] text-red-400 bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 rounded mr-1"
                                          >
                                            {violation}
                                          </span>
                                        ))}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                    <span>
                                      {formatTime12Hour(shift.startTime)} -{' '}
                                      {formatTime12Hour(shift.endTime)}
                                    </span>
                                    <span>
                                      {shift._count.assignments} /{' '}
                                      {shift.bartendersRequired +
                                        shift.barbacksRequired}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-2 flex-shrink-0">
                                  <svg
                                    className="w-4 h-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </PremiumCard>

                {/* This Week's Shifts */}
                <PremiumCard>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-base font-semibold text-gray-100">
                        This Week
                      </h2>
                      <Link
                        href="/shifts"
                        className="px-2 py-1 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-[10px]"
                      >
                        Calendar
                      </Link>
                    </div>
                    {loading ? (
                      <div className="text-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mx-auto mb-1"></div>
                        <p className="text-xs text-gray-400">Loading...</p>
                      </div>
                    ) : weekShifts.length === 0 ? (
                      <div className="text-center py-2">
                        <p className="text-xs text-gray-400">
                          No shifts scheduled for this week
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {weekShifts.slice(0, 5).map((shift) => {
                          const hasViolations = hasStaffingViolations(shift);
                          const violations = getStaffingViolations(shift);
                          return (
                            <Link
                              key={shift.id}
                              href={`/shifts/${shift.id}`}
                              className={`flex items-center justify-between p-2 rounded-lg border transition-all group ${
                                hasViolations
                                  ? 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/70'
                                  : 'border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-purple-500/30'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <h4 className="text-xs font-semibold text-gray-100 truncate">
                                    {shift.venue.name}
                                  </h4>
                                  {hasViolations ? (
                                    <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/40 flex-shrink-0">
                                      ⚠
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20 flex-shrink-0">
                                      ✓
                                    </span>
                                  )}
                                </div>
                                {hasViolations && (
                                  <div className="mb-0.5">
                                    {violations
                                      .slice(0, 1)
                                      .map((violation, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-block text-[10px] text-red-400 bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 rounded"
                                        >
                                          {violation}
                                        </span>
                                      ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                  <span>{formatDate(shift.date)}</span>
                                  <span>
                                    {formatTime12Hour(shift.startTime)} -{' '}
                                    {formatTime12Hour(shift.endTime)}
                                  </span>
                                  <span>
                                    {shift._count.assignments}/
                                    {shift.bartendersRequired +
                                      shift.barbacksRequired}
                                  </span>
                                </div>
                              </div>
                              <svg
                                className="w-3 h-3 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all flex-shrink-0 ml-1.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </Link>
                          );
                        })}
                        {weekShifts.length > 5 && (
                          <div className="text-center pt-1">
                            <Link
                              href="/shifts"
                              className="text-[10px] text-purple-400 hover:text-purple-300"
                            >
                              View {weekShifts.length - 5} more →
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </PremiumCard>
              </div>
            </div>
          )}

          {/* Super Admin Tools Section */}
          {user.role === 'SUPER_ADMIN' && (
            <div className="mb-4">
              <PremiumCard className="border-red-500/30 bg-gradient-to-br from-gray-900/50 to-red-900/10">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-100 mb-1">
                        Admin Tools
                      </h2>
                      <p className="text-sm text-gray-400">
                        System management and business analytics
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Link
                      href="/venues"
                      className="group p-3 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-red-500/30 transition-all cursor-pointer block"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">🏢</span>
                        <h3 className="text-sm font-semibold text-gray-100">
                          Venue Configuration
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        Update venue settings, deadlines, and manager
                        assignments
                      </p>
                      <span className="text-xs text-purple-400 group-hover:text-purple-300 transition-colors">
                        Manage Venues →
                      </span>
                    </Link>

                    <Link
                      href="/shifts"
                      className="group p-3 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-red-500/30 transition-all cursor-pointer block"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">📅</span>
                        <h3 className="text-sm font-semibold text-gray-100">
                          Schedule Management
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        View and modify any shift, assignment, or schedule
                        across all venues
                      </p>
                      <span className="text-xs text-purple-400 group-hover:text-purple-300 transition-colors">
                        Manage Schedules →
                      </span>
                    </Link>

                    <Link
                      href="/scheduling-priority"
                      className="group p-3 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-red-500/30 transition-all cursor-pointer block"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">🎯</span>
                        <h3 className="text-sm font-semibold text-gray-100">
                          Scheduling Priority
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        Set staff scheduling priority order by venue using drag
                        and drop
                      </p>
                      <span className="text-xs text-purple-400 group-hover:text-purple-300 transition-colors">
                        Set Priority →
                      </span>
                    </Link>

                    <Link
                      href="/admin/system-reports"
                      className="group p-3 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-red-500/30 transition-all cursor-pointer block"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">📊</span>
                        <h3 className="text-sm font-semibold text-gray-100">
                          System Reports
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        Business metrics, revenue, client counts, leads, and
                        override analytics
                      </p>
                      <span className="text-xs text-purple-400 group-hover:text-purple-300 transition-colors">
                        View Reports →
                      </span>
                    </Link>

                    <Link
                      href="/admin/app-health"
                      className="group p-3 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-red-500/30 transition-all cursor-pointer block"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">💚</span>
                        <h3 className="text-sm font-semibold text-gray-100">
                          App Health
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        Monitor system health, errors, and performance metrics
                      </p>
                      <span className="text-xs text-purple-400 group-hover:text-purple-300 transition-colors">
                        View Health →
                      </span>
                    </Link>
                  </div>
                </div>
              </PremiumCard>
            </div>
          )}

          {/* Management Tools - Only for Managers and General Managers */}
          {(user.role === 'MANAGER' || user.role === 'GENERAL_MANAGER') && (
            <div className="mb-2">
              <PremiumCard className="border-purple-500/30 bg-gradient-to-br from-gray-900/50 to-purple-900/10">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-base font-bold text-gray-100 mb-0.5">
                        Management Tools
                      </h2>
                      <p className="text-xs text-gray-400">
                        Manage your venues and schedules
                      </p>
                    </div>
                  </div>

                  {/* Stats Overview */}
                  {managedVenues.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="text-center p-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
                        <div className="text-xl font-bold text-gray-100 mb-0.5">
                          {venueStats.totalVenues}
                        </div>
                        <div className="text-[10px] text-gray-400">Venues</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
                        <div className="text-xl font-bold text-purple-400 mb-0.5">
                          {venueStats.upcomingShifts}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Upcoming
                        </div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
                        <div className="text-xl font-bold text-blue-400 mb-0.5">
                          {venueStats.totalShifts}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          This Month
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    <Link
                      href="/staff"
                      className="group p-2 rounded-lg border border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/70 transition-all cursor-pointer block"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">👥</span>
                        <h3 className="text-xs font-semibold text-gray-100">
                          Staff Management
                        </h3>
                      </div>
                      <p className="text-[10px] text-gray-400 mb-1">
                        View and manage staff members
                      </p>
                      <span className="text-[10px] text-purple-400 group-hover:text-purple-300 transition-colors">
                        Manage →
                      </span>
                    </Link>

                    <Link
                      href="/venues"
                      className="group p-2 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-purple-500/30 transition-all cursor-pointer block"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">🏢</span>
                        <h3 className="text-xs font-semibold text-gray-100">
                          Venue Configuration
                        </h3>
                      </div>
                      <p className="text-[10px] text-gray-400 mb-1">
                        Update venue settings and deadlines
                      </p>
                      <span className="text-[10px] text-purple-400 group-hover:text-purple-300 transition-colors">
                        Manage →
                      </span>
                    </Link>

                    <Link
                      href="/shifts"
                      className="group p-2 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-purple-500/30 transition-all cursor-pointer block"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">📅</span>
                        <h3 className="text-xs font-semibold text-gray-100">
                          Schedule Management
                        </h3>
                      </div>
                      <p className="text-[10px] text-gray-400 mb-1">
                        View and manage shifts and schedules
                      </p>
                      <span className="text-[10px] text-purple-400 group-hover:text-purple-300 transition-colors">
                        Manage →
                      </span>
                    </Link>

                    <Link
                      href="/scheduling-priority"
                      className="group p-2 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-purple-500/30 transition-all cursor-pointer block"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">🎯</span>
                        <h3 className="text-xs font-semibold text-gray-100">
                          Scheduling Priority
                        </h3>
                      </div>
                      <p className="text-[10px] text-gray-400 mb-1">
                        Set staff priority order by venue
                      </p>
                      <span className="text-[10px] text-purple-400 group-hover:text-purple-300 transition-colors">
                        Set Priority →
                      </span>
                    </Link>

                    <Link
                      href="/reports"
                      className="group p-2 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-purple-500/30 transition-all cursor-pointer block"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">📊</span>
                        <h3 className="text-xs font-semibold text-gray-100">
                          Venue Reports
                        </h3>
                      </div>
                      <p className="text-[10px] text-gray-400 mb-1">
                        View reports and analytics
                      </p>
                      <span className="text-[10px] text-purple-400 group-hover:text-purple-300 transition-colors">
                        View →
                      </span>
                    </Link>
                  </div>
                </div>
              </PremiumCard>
            </div>
          )}
        </main>

        {/* Create Shift Modal */}
        <CreateShiftModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onShiftCreated={() => {
            // Refetch shifts when a new shift is created
            if (status === 'authenticated') {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              const weekEnd = new Date(today);
              weekEnd.setDate(weekEnd.getDate() + 7);

              // Fetch today's shifts
              const todayParams = new URLSearchParams({
                startDate: today.toISOString().split('T')[0],
                endDate: tomorrow.toISOString().split('T')[0],
              });

              fetch(`/api/shifts?${todayParams}`).then((res) => {
                if (res.ok) {
                  res.json().then((data) => setTodayShifts(data));
                }
              });

              // Fetch this week's shifts
              const weekParams = new URLSearchParams({
                startDate: today.toISOString().split('T')[0],
                endDate: weekEnd.toISOString().split('T')[0],
              });

              fetch(`/api/shifts?${weekParams}`).then((res) => {
                if (res.ok) {
                  res.json().then((data) => setWeekShifts(data));
                }
              });

              // Refetch managed venues stats if manager
              if (user.role === 'MANAGER' || user.role === 'GENERAL_MANAGER') {
                fetchManagedVenues();
              }
            }
          }}
        />
      </div>
    </PremiumLayout>
  );
}
