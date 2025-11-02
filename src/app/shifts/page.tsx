'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';
import { Breadcrumb } from '@/components/breadcrumb';
import { CreateShiftModal } from '@/components/create-shift-modal';
import { formatTime12Hour } from '@/lib/utils';

interface Venue {
  id: string;
  name: string;
}

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
  venue: Venue & {
    tipPoolEnabled?: boolean;
  };
  assignments: ShiftAssignment[];
  _count: {
    assignments: number;
  };
}

export default function ShiftsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedShiftForTips, setSelectedShiftForTips] =
    useState<Shift | null>(null);
  const [tipAmount, setTipAmount] = useState('');
  const [savingTips, setSavingTips] = useState(false);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [autoScheduleMessage, setAutoScheduleMessage] = useState('');

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const userRole = session?.user?.role;
  const isManager = userRole === 'MANAGER' || userRole === 'GENERAL_MANAGER';
  const isStaff = !isManager && !isSuperAdmin;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // Redirect staff users to dashboard
    if (status === 'authenticated' && isStaff) {
      router.push('/dashboard');
    }
  }, [status, isStaff, router]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl+N to create new shift (only for managers and super admins)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === 'n' &&
        (isManager || isSuperAdmin)
      ) {
        e.preventDefault();
        setShowCreateModal(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isManager, isSuperAdmin]);

  useEffect(() => {
    async function fetchVenues() {
      try {
        const response = await fetch('/api/venues');
        if (response.ok) {
          const data = await response.json();
          setVenues(data);
        }
      } catch (err) {
        console.error('Failed to fetch venues:', err);
      }
    }

    if (status === 'authenticated') {
      fetchVenues();
    }
  }, [status]);

  const fetchShifts = useCallback(async () => {
    // For super admin in Step 1 (no venue selected), skip
    if (isSuperAdmin && !selectedVenue) {
      setShifts([]);
      setLoading(false);
      return;
    }

    // For super admin in Step 2 (venue selected, no date), fetch all shifts for the month to show indicators
    if (isSuperAdmin && selectedVenue && !selectedDate) {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('venueId', selectedVenue);

        const monthStart = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          1
        );
        const monthEnd = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          0
        );
        params.append('startDate', monthStart.toISOString().split('T')[0]);
        params.append('endDate', monthEnd.toISOString().split('T')[0]);

        const response = await fetch(`/api/shifts?${params}`);
        if (response.ok) {
          const data = await response.json();
          setShifts(data);
        }
        setLoading(false);
        return;
      } catch (err) {
        setShifts([]);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedVenue && selectedVenue !== 'all') {
        params.append('venueId', selectedVenue);
      }

      if (isSuperAdmin && selectedDate) {
        // For super admin, fetch just the selected day
        params.append('startDate', selectedDate);
        params.append('endDate', selectedDate);
      } else if (!isSuperAdmin) {
        // For managers, fetch the month
        const monthStart = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          1
        );
        const monthEnd = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          0
        );
        params.append('startDate', monthStart.toISOString().split('T')[0]);
        params.append('endDate', monthEnd.toISOString().split('T')[0]);
      }

      const response = await fetch(`/api/shifts?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch shifts');
      }
      const data = await response.json();
      setShifts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }, [selectedVenue, selectedDate, currentMonth, isSuperAdmin]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchShifts();
    }
  }, [
    status,
    currentMonth,
    selectedVenue,
    selectedDate,
    isSuperAdmin,
    fetchShifts,
  ]);

  async function handleAutoSchedule() {
    if (!isManager && !isSuperAdmin) return;

    try {
      setAutoScheduling(true);
      setAutoScheduleMessage('');
      setError('');

      const params = new URLSearchParams();

      if (selectedVenue && selectedVenue !== 'all') {
        params.append('venueId', selectedVenue);
      }

      // Calculate date range for current month
      const monthStart = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const monthEnd = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      );
      params.append('startDate', monthStart.toISOString().split('T')[0]);
      params.append('endDate', monthEnd.toISOString().split('T')[0]);

      const response = await fetch(`/api/shifts/auto-schedule?${params}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to auto-schedule');
      }

      const result = await response.json();

      if (result.processed === 0) {
        setAutoScheduleMessage('All shifts are already fully staffed');
      } else {
        setAutoScheduleMessage(
          `Auto-scheduled ${result.processed} shift(s). ${result.assigned} staff assigned.`
        );
      }

      // Refresh shifts to show updated assignments
      await fetchShifts();

      // Clear message after 5 seconds
      setTimeout(() => {
        setAutoScheduleMessage('');
      }, 5000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to auto-schedule shifts'
      );
      setAutoScheduleMessage('');
    } finally {
      setAutoScheduling(false);
    }
  }

  function navigateMonth(direction: number) {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
    setLoading(true);
  }

  function getCalendarDays() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }

  function getShiftsForDay(date: Date | null): Shift[] {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter((shift) => shift.date.startsWith(dateStr));
  }

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

  function isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shiftDate = new Date(date);
    shiftDate.setHours(0, 0, 0, 0);
    return (
      today.getDate() === shiftDate.getDate() &&
      today.getMonth() === shiftDate.getMonth() &&
      today.getFullYear() === shiftDate.getFullYear()
    );
  }

  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function handleDateSelect(date: Date) {
    setSelectedDate(formatDateForInput(date));
  }

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  if (loading && shifts.length === 0 && !selectedVenue) {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </PremiumLayout>
    );
  }

  // Super Admin workflow: Step 1 - Select Venue
  if (isSuperAdmin && !selectedVenue) {
    return (
      <PremiumLayout>
        <div className="relative z-10 min-h-screen">
          <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Schedule Management
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Select a venue to manage schedules
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <UserMenu />
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-sm"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Breadcrumb />

            <PremiumCard>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Step 1: Select Venue
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Choose a venue to view and manage its schedule
                </p>

                {venues.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      No venues available
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {venues.map((venue) => (
                      <button
                        key={venue.id}
                        onClick={() => setSelectedVenue(venue.id)}
                        className="p-6 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-purple-500/50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-purple-400"
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
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-400 dark:group-hover:text-purple-400 transition-colors">
                            {venue.name}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                          View and manage shifts →
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </PremiumCard>
          </main>
        </div>
      </PremiumLayout>
    );
  }

  // Super Admin workflow: Step 2 - Select Day
  if (isSuperAdmin && selectedVenue && !selectedDate) {
    const selectedVenueData = venues.find((v) => v.id === selectedVenue);

    return (
      <PremiumLayout>
        <div className="relative z-10 min-h-screen">
          <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Schedule Management
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedVenueData?.name || 'Select a day'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <UserMenu />
                  <button
                    onClick={() => setSelectedVenue('')}
                    className="px-4 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-sm"
                  >
                    Change Venue
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-sm"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumb />

            <PremiumCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      Step 2: Select Day
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Choose a date to view and manage shifts
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                    >
                      ← Previous
                    </button>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-[200px] text-center">
                      {monthName}
                    </div>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                    >
                      Next →
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div>
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2"
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {getCalendarDays().map((date, idx) => {
                      if (!date) return null;
                      const isTodayDate = isToday(date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dateAtMidnight = new Date(date);
                      dateAtMidnight.setHours(0, 0, 0, 0);
                      const isPast = dateAtMidnight < today;
                      const isFuture = dateAtMidnight > today;

                      // Check if this day has shifts
                      const dayShifts = getShiftsForDay(date);
                      const hasShifts = dayShifts.length > 0;

                      if (!date) {
                        return (
                          <div key={idx} className="p-2 min-h-[80px]"></div>
                        );
                      }

                      const dateStr = formatDateForInput(date);
                      const isSelected = selectedDate === dateStr;

                      // Determine styling based on shifts and date
                      let dayStyles = '';
                      if (isSelected) {
                        dayStyles =
                          'border-purple-500 bg-purple-500/20 ring-2 ring-purple-500/50';
                      } else if (hasShifts) {
                        // Green for dates with shifts (regardless of past/future)
                        dayStyles =
                          'border-green-500/50 bg-green-500/10 hover:border-green-500/70';
                      } else if (isTodayDate) {
                        dayStyles =
                          'border-purple-500/50 bg-purple-500/10 hover:border-purple-500/70';
                      } else {
                        dayStyles =
                          'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/20 hover:border-purple-500/50 hover:bg-purple-500/5';
                      }

                      // Only disable past dates that don't have shifts
                      const isDisabled = isPast && !hasShifts;

                      return (
                        <button
                          key={idx}
                          onClick={() => handleDateSelect(date)}
                          disabled={isDisabled}
                          className={`p-3 rounded-lg border min-h-[80px] transition-all ${dayStyles} ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div
                            className={`text-lg font-semibold mb-1 ${
                              isSelected
                                ? 'text-purple-600 dark:text-purple-400'
                                : hasShifts
                                  ? 'text-green-600 dark:text-green-400'
                                  : isTodayDate
                                    ? 'text-purple-500 dark:text-purple-400'
                                    : 'text-gray-900 dark:text-gray-300'
                            }`}
                          >
                            {date.getDate()}
                          </div>
                          {isSelected && (
                            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                              Selected
                            </div>
                          )}
                          {hasShifts && !isSelected && (
                            <div className="text-xs font-medium mt-1 text-green-600 dark:text-green-400">
                              {dayShifts.length} shift
                              {dayShifts.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedDate && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        // Continue to view shifts for selected date
                      }}
                      className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                    >
                      View Shifts for{' '}
                      {new Date(selectedDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </button>
                  </div>
                )}
              </div>
            </PremiumCard>
          </main>
        </div>
      </PremiumLayout>
    );
  }

  // Super Admin workflow: Step 3 - View/Edit Shifts for Selected Day
  if (isSuperAdmin && selectedVenue && selectedDate) {
    const selectedVenueData = venues.find((v) => v.id === selectedVenue);
    const selectedDateObj = new Date(selectedDate);
    const selectedDateFormatted = selectedDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <PremiumLayout>
        <div className="relative z-10 min-h-screen">
          <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Schedule Management
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedVenueData?.name} • {selectedDateFormatted}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <UserMenu />
                  <button
                    onClick={() => setSelectedDate('')}
                    className="px-4 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-sm"
                  >
                    Change Day
                  </button>
                  <button
                    onClick={() => {
                      setSelectedVenue('');
                      setSelectedDate('');
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-sm"
                  >
                    Change Venue
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-sm"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumb />

            {error && (
              <PremiumCard className="border-red-500/30 bg-gradient-to-br from-red-900/20 to-gray-900/50 mb-6">
                <div className="p-4 text-red-400">{error}</div>
              </PremiumCard>
            )}

            {loading ? (
              <PremiumCard>
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Loading shifts...
                  </p>
                </div>
              </PremiumCard>
            ) : shifts.length === 0 ? (
              <PremiumCard>
                <div className="p-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    No shifts scheduled for {selectedDateFormatted}
                  </p>
                  <button
                    onClick={() =>
                      router.push(
                        `/shifts/new?venueId=${selectedVenue}&date=${selectedDate}`
                      )
                    }
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                  >
                    Create Shift
                  </button>
                </div>
              </PremiumCard>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Shifts for {selectedDateFormatted}
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-sm"
                  >
                    + Add Shift
                  </button>
                </div>

                {shifts.map((shift) => {
                  const isFullyStaffed = isShiftFullyStaffed(shift);

                  return (
                    <PremiumCard
                      key={shift.id}
                      className="border-gray-300 dark:border-gray-700 hover:border-purple-500/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer group"
                      onClick={() => router.push(`/shifts/${shift.id}`)}
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {shift.eventName ? (
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                  {shift.eventName}
                                </h3>
                              ) : (
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                  {shift.venue.name}
                                </h3>
                              )}
                              {isFullyStaffed ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                  Fully Staffed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                                  Needs Staff
                                </span>
                              )}
                            </div>
                            {shift.eventName && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                {shift.venue.name}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>
                                {formatTime12Hour(shift.startTime)} -{' '}
                                {formatTime12Hour(shift.endTime)}
                              </span>
                              <span>
                                {shift._count.assignments} /{' '}
                                {shift.bartendersRequired +
                                  shift.barbacksRequired}{' '}
                                assigned
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <svg
                              className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
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

  // Manager view - keep existing calendar view
  return (
    <PremiumLayout>
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Shift Scheduler
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Manage shifts and staff assignments
                </p>
              </div>
              <div className="flex items-center gap-3">
                <UserMenu />
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-sm"
                  title="Press Cmd/Ctrl+N to create a new shift"
                >
                  Create Shift
                  <span className="hidden lg:inline ml-2 text-xs opacity-70">
                    ({navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+N)
                  </span>
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-sm"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb />

          {/* Filters */}
          <PremiumCard>
            <div className="p-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs"
                  >
                    ← Prev
                  </button>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 min-w-[160px] text-center">
                    {monthName}
                  </div>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs"
                  >
                    Next →
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <label
                      htmlFor="venueFilter"
                      className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Filter by Venue
                    </label>
                    <select
                      id="venueFilter"
                      value={selectedVenue || 'all'}
                      onChange={(e) =>
                        setSelectedVenue(
                          e.target.value === 'all' ? '' : e.target.value
                        )
                      }
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-sm"
                    >
                      <option value="all">All Venues</option>
                      {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      View
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          viewMode === 'calendar'
                            ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        Calendar
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          viewMode === 'list'
                            ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        List
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 mt-3">
                <button
                  onClick={handleAutoSchedule}
                  disabled={autoScheduling || loading}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {autoScheduling ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Auto-Scheduling...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      Auto Schedule
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs mt-3">
                  {error}
                </div>
              )}
              {autoScheduleMessage && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs mt-3">
                  {autoScheduleMessage}
                </div>
              )}
            </div>
          </PremiumCard>

          {viewMode === 'calendar' ? (
            /* Calendar Grid */
            <div className="mt-3">
              <PremiumCard>
                <div className="p-3">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-medium text-gray-600 dark:text-gray-400 py-1"
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {getCalendarDays().map((date, idx) => {
                      if (!date) {
                        return (
                          <div key={idx} className="p-1 min-h-[100px]"></div>
                        );
                      }

                      const dayShifts = getShiftsForDay(date);
                      const isTodayDate = isToday(date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dateAtMidnight = new Date(date);
                      dateAtMidnight.setHours(0, 0, 0, 0);
                      const isPast = dateAtMidnight < today;
                      const isFuture = dateAtMidnight > today;
                      const hasShifts = dayShifts.length > 0;

                      // Determine styling based on shifts and date
                      let dayStyles = '';
                      if (isTodayDate) {
                        dayStyles = 'border-purple-500/50 bg-purple-500/10';
                      } else if (hasShifts) {
                        // Green for dates with shifts (regardless of past/future)
                        dayStyles = 'border-green-500/50 bg-green-500/10';
                      } else {
                        dayStyles =
                          'border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/20';
                      }

                      return (
                        <div
                          key={idx}
                          className={`p-1 rounded-lg border min-h-[100px] ${dayStyles}`}
                        >
                          <div
                            className={`text-sm font-semibold mb-0.5 ${
                              isTodayDate
                                ? 'text-purple-600 dark:text-purple-400'
                                : hasShifts
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-900 dark:text-gray-300'
                            }`}
                          >
                            {date.getDate()}
                          </div>

                          <div className="space-y-0.5">
                            {dayShifts.slice(0, 3).map((shift) => {
                              const isFullyStaffed = isShiftFullyStaffed(shift);

                              return (
                                <div
                                  key={shift.id}
                                  onClick={() =>
                                    router.push(`/shifts/${shift.id}`)
                                  }
                                  className={`p-1 rounded cursor-pointer hover:opacity-80 transition-all text-[10px] ${
                                    isFullyStaffed
                                      ? 'border-green-500/50 bg-green-500/10'
                                      : 'border-yellow-500/50 bg-yellow-500/10'
                                  } border`}
                                >
                                  <div className="font-semibold text-gray-900 dark:text-gray-200 truncate">
                                    {shift.eventName || shift.venue.name}
                                  </div>
                                  {shift.eventName && (
                                    <div className="text-gray-500 dark:text-gray-400 text-[9px] truncate">
                                      {shift.venue.name}
                                    </div>
                                  )}
                                  <div className="text-gray-600 dark:text-gray-400 text-[9px]">
                                    {formatTime12Hour(shift.startTime)}
                                  </div>
                                  <div className="text-gray-500 dark:text-gray-500 text-[8px]">
                                    {shift._count.assignments}/
                                    {shift.bartendersRequired +
                                      shift.barbacksRequired}
                                  </div>
                                </div>
                              );
                            })}
                            {dayShifts.length > 3 && (
                              <div className="text-[10px] text-gray-500 dark:text-gray-500 text-center pt-0.5">
                                +{dayShifts.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PremiumCard>
            </div>
          ) : (
            /* List View */
            <div className="mt-6">
              <PremiumCard>
                <div className="p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      All Shifts for {monthName}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {shifts.length} shift{shifts.length !== 1 ? 's' : ''}{' '}
                      total
                    </p>
                  </div>

                  {shifts.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400">
                        No shifts scheduled for this month
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shifts
                        .sort((a, b) => {
                          const dateA = new Date(a.date);
                          const dateB = new Date(b.date);
                          if (dateA.getTime() !== dateB.getTime()) {
                            return dateB.getTime() - dateA.getTime(); // Most recent first
                          }
                          return a.startTime.localeCompare(b.startTime);
                        })
                        .map((shift) => {
                          const isFullyStaffed = isShiftFullyStaffed(shift);
                          const shiftDate = new Date(shift.date);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          shiftDate.setHours(0, 0, 0, 0);
                          const isPast = shiftDate < today;
                          const hasTips = shift.assignments.some(
                            (a) =>
                              a.tipAmount !== null && Number(a.tipAmount) > 0
                          );
                          const avgTip =
                            shift.assignments.length > 0 &&
                            shift.assignments[0].tipAmount
                              ? Number(shift.assignments[0].tipAmount).toFixed(
                                  2
                                )
                              : null;

                          return (
                            <div
                              key={shift.id}
                              className={`p-4 rounded-lg border transition-all ${
                                isPast
                                  ? 'border-gray-700 bg-gray-800/30'
                                  : isFullyStaffed
                                    ? 'border-green-500/50 bg-green-500/10'
                                    : 'border-yellow-500/50 bg-yellow-500/10'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-base font-semibold text-gray-100">
                                      {shift.eventName || shift.venue.name}
                                    </h3>
                                    {shift.eventName && (
                                      <span className="text-sm text-gray-400">
                                        {shift.venue.name}
                                      </span>
                                    )}
                                    {isPast && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                                        Past
                                      </span>
                                    )}
                                    {isFullyStaffed ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                                        Fully Staffed
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                        Needs Staff
                                      </span>
                                    )}
                                    {hasTips && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        💰 Tips: ${avgTip}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <span>
                                      {new Date(shift.date).toLocaleDateString(
                                        'en-US',
                                        {
                                          weekday: 'short',
                                          month: 'short',
                                          day: 'numeric',
                                        }
                                      )}
                                    </span>
                                    <span>
                                      {formatTime12Hour(shift.startTime)} -{' '}
                                      {formatTime12Hour(shift.endTime)}
                                    </span>
                                    <span>
                                      {shift._count.assignments} /{' '}
                                      {shift.bartendersRequired +
                                        shift.barbacksRequired}{' '}
                                      assigned
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  {shift.venue.tipPoolEnabled &&
                                    shift.assignments.length > 0 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedShiftForTips(shift);
                                          setTipAmount(avgTip || '');
                                          setShowTipModal(true);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                          hasTips
                                            ? 'border border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                                            : 'border border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                                        }`}
                                      >
                                        {hasTips ? 'Edit Tips' : 'Add Tips'}
                                      </button>
                                    )}
                                  <button
                                    onClick={() =>
                                      router.push(`/shifts/${shift.id}`)
                                    }
                                    className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 text-xs font-medium hover:bg-gray-800 transition-all"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </PremiumCard>
            </div>
          )}

          {shifts.length === 0 && !loading && (
            <PremiumCard>
              <div className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No shifts scheduled for this month
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                >
                  Create Your First Shift
                </button>
              </div>
            </PremiumCard>
          )}
        </main>
      </div>
      <CreateShiftModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onShiftCreated={() => {
          // Refetch shifts when a new shift is created
          fetchShifts();
        }}
        defaultVenueId={
          isSuperAdmin && selectedVenue ? selectedVenue : undefined
        }
        defaultDate={isSuperAdmin && selectedDate ? selectedDate : undefined}
      />

      {/* Tip Entry Modal */}
      {showTipModal && selectedShiftForTips && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={() => {
              if (!savingTips) {
                setShowTipModal(false);
                setSelectedShiftForTips(null);
                setTipAmount('');
              }
            }}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4">
            <PremiumCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-100">
                    Enter Tips
                  </h3>
                  <button
                    onClick={() => {
                      if (!savingTips) {
                        setShowTipModal(false);
                        setSelectedShiftForTips(null);
                        setTipAmount('');
                      }
                    }}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                    disabled={savingTips}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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

                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">
                    {selectedShiftForTips.eventName ||
                      selectedShiftForTips.venue.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedShiftForTips.date).toLocaleDateString(
                      'en-US',
                      {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}{' '}
                    • {formatTime12Hour(selectedShiftForTips.startTime)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedShiftForTips.assignments.length} staff member
                    {selectedShiftForTips.assignments.length !== 1 ? 's' : ''}{' '}
                    assigned
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tip Amount per Person ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={savingTips}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This amount will be applied evenly to all{' '}
                    {selectedShiftForTips.assignments.length} staff member
                    {selectedShiftForTips.assignments.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      if (!savingTips) {
                        setShowTipModal(false);
                        setSelectedShiftForTips(null);
                        setTipAmount('');
                      }
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 font-medium hover:bg-gray-800 transition-all"
                    disabled={savingTips}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedShiftForTips) return;

                      setSavingTips(true);
                      setError('');

                      try {
                        const perPersonAmount = parseFloat(tipAmount || '0');

                        if (perPersonAmount < 0) {
                          throw new Error('Tip amount cannot be negative');
                        }

                        if (selectedShiftForTips.assignments.length === 0) {
                          throw new Error('No staff assigned to this shift');
                        }

                        const response = await fetch(
                          `/api/shifts/${selectedShiftForTips.id}/tips`,
                          {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ perPersonAmount }),
                          }
                        );

                        if (!response.ok) {
                          const data = await response.json();
                          throw new Error(data.error || 'Failed to save tips');
                        }

                        // Refresh shifts
                        await fetchShifts();

                        setShowTipModal(false);
                        setSelectedShiftForTips(null);
                        setTipAmount('');
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : 'Failed to save tips'
                        );
                      } finally {
                        setSavingTips(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-500 hover:to-blue-500 transition-all"
                    disabled={savingTips}
                  >
                    {savingTips ? 'Saving...' : 'Save Tips'}
                  </button>
                </div>
              </div>
            </PremiumCard>
          </div>
        </>
      )}
    </PremiumLayout>
  );
}
