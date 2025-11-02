'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';
import { Breadcrumb } from '@/components/breadcrumb';
import { Toast } from '@/components/toast';

interface AvailabilityData {
  userId: string;
  month: string;
  data: Record<
    string,
    {
      available: boolean;
      note?: string;
    }
  >;
  submittedAt: string | null;
  lockedAt: string | null;
  isLocked: boolean;
  updatedAt?: string;
  unlock?: {
    id: string;
    unlockedBy: string;
    unlockedAt: string;
    reason?: string;
    manager: {
      id: string;
      name: string;
    };
  } | null;
}

export default function AvailabilityPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentMonth, setCurrentMonth] = useState('');
  const [availability, setAvailability] = useState<AvailabilityData | null>(
    null
  );
  const [selectedDates, setSelectedDates] = useState<Record<string, boolean>>(
    {}
  );
  const [savedDates, setSavedDates] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [venues, setVenues] = useState<
    Array<{ id: string; name: string; availabilityDeadlineDay: number }>
  >([]);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // Set default to next month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(monthStr);
  }, []);

  const fetchAvailability = useCallback(async () => {
    if (!currentMonth) return;

    try {
      const response = await fetch(`/api/availability?month=${currentMonth}`);
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }
      const data = await response.json();
      setAvailability(data);

      // Initialize selected dates
      const dates: Record<string, boolean> = {};
      if (data.data && typeof data.data === 'object') {
        Object.entries(data.data).forEach(([dateStr, info]) => {
          if (
            typeof info === 'object' &&
            info !== null &&
            'available' in info
          ) {
            dates[dateStr] = (info as { available: boolean }).available;
          }
        });
      }
      setSelectedDates(dates);
      setSavedDates({ ...dates }); // Save snapshot for comparison

      // Fetch venues for deadline info
      try {
        const venuesResponse = await fetch('/api/venues');
        if (venuesResponse.ok) {
          const venuesData = await venuesResponse.json();
          setVenues(venuesData);
        }
      } catch {
        // Silently fail - venues are optional for availability
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load availability'
      );
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    if (status === 'authenticated' && currentMonth) {
      fetchAvailability();
    }
  }, [status, currentMonth, fetchAvailability]);

  function getDaysInMonth(month: string): Date[] {
    const [year, monthNum] = month.split('-').map(Number);
    const firstDay = new Date(year, monthNum - 1, 1);
    const lastDay = new Date(year, monthNum, 0);
    const days: Date[] = [];

    for (let d = firstDay; d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    return days;
  }

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function toggleDate(dateStr: string) {
    if (availability?.isLocked) return;

    setSelectedDates((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  }

  // Check if there are unsaved changes
  const hasUnsavedChanges = React.useMemo(() => {
    const selectedKeys = Object.keys(selectedDates).sort();
    const savedKeys = Object.keys(savedDates).sort();

    if (selectedKeys.length !== savedKeys.length) {
      return true;
    }

    for (const key of selectedKeys) {
      if (selectedDates[key] !== savedDates[key]) {
        return true;
      }
    }

    return false;
  }, [selectedDates, savedDates]);

  function selectAllAvailable() {
    if (availability?.isLocked) return;

    const days = getDaysInMonth(currentMonth);
    const newDates: Record<string, boolean> = {};
    days.forEach((day) => {
      newDates[formatDate(day)] = true;
    });
    setSelectedDates(newDates);
  }

  function selectAllUnavailable() {
    if (availability?.isLocked) return;

    const days = getDaysInMonth(currentMonth);
    const newDates: Record<string, boolean> = {};
    days.forEach((day) => {
      newDates[formatDate(day)] = false;
    });
    setSelectedDates(newDates);
  }

  function selectWeekends() {
    if (availability?.isLocked) return;

    const days = getDaysInMonth(currentMonth);
    const newDates = { ...selectedDates };
    days.forEach((day) => {
      const dayOfWeek = day.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Sunday or Saturday
        newDates[formatDate(day)] = true;
      }
    });
    setSelectedDates(newDates);
  }

  function selectWeekendsOff() {
    if (availability?.isLocked) return;

    const days = getDaysInMonth(currentMonth);
    const newDates = { ...selectedDates };
    days.forEach((day) => {
      const dayOfWeek = day.getDay();
      // Monday (1) through Friday (5) are weekdays
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        newDates[formatDate(day)] = true;
      }
    });
    setSelectedDates(newDates);
  }

  async function handleUnlock() {
    if (!session?.user?.id || !availability) return;

    setUnlocking(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/availability/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          month: currentMonth,
          reason: unlockReason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unlock availability');
      }

      setSuccess('Availability unlocked successfully');
      setShowUnlockModal(false);
      setUnlockReason('');
      // Reload availability
      await fetchAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock');
    } finally {
      setUnlocking(false);
    }
  }

  async function handleLock() {
    if (!session?.user?.id || !availability) return;

    setUnlocking(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `/api/availability/unlock?userId=${session.user.id}&month=${currentMonth}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to lock availability');
      }

      setSuccess('Availability locked');
      // Reload availability
      await fetchAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock');
    } finally {
      setUnlocking(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Convert selected dates to availability data format
      const availabilityData: Record<string, { available: boolean }> = {};
      Object.entries(selectedDates).forEach(([dateStr, available]) => {
        availabilityData[dateStr] = { available };
      });

      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: currentMonth,
          data: availabilityData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save availability');
      }

      const updatedAvailability = await response.json();
      setAvailability(updatedAvailability);
      setSavedDates({ ...selectedDates }); // Update saved snapshot
      setSuccess('Availability saved successfully!');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save availability'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    // Get the deadline date for the confirmation message
    let deadlineMessage = 'the deadline';
    if (venues.length > 0 && currentMonth) {
      const [year, monthNum] = currentMonth.split('-').map(Number);
      const deadlines = venues.map((v) => {
        const deadlineDate = new Date(
          year,
          monthNum - 1,
          v.availabilityDeadlineDay
        );
        return {
          venue: v.name,
          date: deadlineDate,
          day: v.availabilityDeadlineDay,
        };
      });
      const earliestDeadline = deadlines.sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      )[0];
      const deadlineStr = earliestDeadline.date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      deadlineMessage = deadlineStr;
    }

    if (
      !confirm(
        `Are you sure you want to submit your availability? You can continue to make changes and resubmit until ${deadlineMessage}. Submitting early increases your chances of receiving more shifts.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // First save the current availability
      await handleSave();

      // Then submit it
      const response = await fetch('/api/availability/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: currentMonth,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit availability');
      }

      const updatedAvailability = await response.json();
      setAvailability(updatedAvailability);
      setSavedDates({ ...selectedDates }); // Update saved snapshot
      setSuccess('Availability submitted successfully!');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit availability'
      );
    } finally {
      setSaving(false);
    }
  }

  function changeMonth(offset: number) {
    const [year, month] = currentMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + offset, 1);
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
    setLoading(true);
  }

  const days = getDaysInMonth(currentMonth);
  const [year, month] = currentMonth.split('-');
  const monthName = new Date(
    parseInt(year),
    parseInt(month) - 1
  ).toLocaleString('default', { month: 'long', year: 'numeric' });

  const isLocked = availability?.isLocked || false;
  const isSubmitted = availability?.submittedAt !== null;

  if (loading) {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading availability...</p>
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
                  Availability Calendar
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
                  {(() => {
                    // Get the earliest deadline from venues for the current month
                    if (venues.length > 0 && currentMonth) {
                      const [year, monthNum] = currentMonth
                        .split('-')
                        .map(Number);
                      const deadlines = venues.map((v) => {
                        const deadlineDate = new Date(
                          year,
                          monthNum - 1,
                          v.availabilityDeadlineDay
                        );
                        return {
                          venue: v.name,
                          date: deadlineDate,
                          day: v.availabilityDeadlineDay,
                        };
                      });
                      const earliestDeadline = deadlines.sort(
                        (a, b) => a.date.getTime() - b.date.getTime()
                      )[0];
                      const deadlineStr =
                        earliestDeadline.date.toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                        });

                      return (
                        <>
                          Mark your availability below. Deadline:{' '}
                          <span className="font-semibold text-purple-400">
                            {deadlineStr}
                          </span>
                          . Save drafts anytime or submit early for better shift
                          allocation.
                        </>
                      );
                    }
                    return 'Mark your availability below. Save drafts anytime or submit early for better shift allocation.';
                  })()}
                </p>
              </div>
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          {/* Controls Bar */}
          <PremiumCard className="mb-4">
            <div className="p-4">
              {/* Top Row: Month Navigation and Status */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700 dark:border-gray-600">
                {/* Month Navigation */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="px-3 py-1.5 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-sm"
                    disabled={saving}
                  >
                    ←
                  </button>
                  <h2 className="text-lg font-semibold text-foreground dark:text-gray-100 whitespace-nowrap min-w-[140px]">
                    {monthName}
                  </h2>
                  <select
                    value={currentMonth}
                    onChange={(e) => {
                      setCurrentMonth(e.target.value);
                      setLoading(true);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    disabled={saving}
                  >
                    {(() => {
                      const options = [];
                      const now = new Date();
                      for (let i = 0; i < 13; i++) {
                        const date = new Date(
                          now.getFullYear(),
                          now.getMonth() + i,
                          1
                        );
                        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        const monthLabel = date.toLocaleString('default', {
                          month: 'long',
                          year: 'numeric',
                        });
                        options.push(
                          <option key={monthStr} value={monthStr}>
                            {monthLabel}
                          </option>
                        );
                      }
                      return options;
                    })()}
                  </select>
                  <button
                    onClick={() => changeMonth(1)}
                    className="px-3 py-1.5 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-sm"
                    disabled={saving}
                  >
                    →
                  </button>
                </div>

                {/* Status Badge and Action Buttons */}
                <div className="flex items-center gap-3">
                  {/* Status Badge */}
                  {isLocked && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                      Locked
                    </span>
                  )}
                  {isSubmitted && !isLocked && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                      Submitted{' '}
                      {availability?.submittedAt && (
                        <span className="ml-2 text-[10px] opacity-80">
                          {new Date(
                            availability.submittedAt
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          {new Date(
                            availability.submittedAt
                          ).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </span>
                  )}
                  {!isSubmitted && !isLocked && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20">
                      Draft{' '}
                      {availability?.updatedAt && (
                        <span className="ml-2 text-[10px] opacity-80">
                          Saved{' '}
                          {new Date(availability.updatedAt).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                            }
                          )}{' '}
                          {new Date(availability.updatedAt).toLocaleTimeString(
                            'en-US',
                            {
                              hour: 'numeric',
                              minute: '2-digit',
                            }
                          )}
                        </span>
                      )}
                    </span>
                  )}

                  {/* Unlock Status */}
                  {availability?.unlock && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                      Unlocked by {availability.unlock.manager.name}
                    </span>
                  )}

                  {/* Manager Unlock/Lock Buttons */}
                  {(session?.user?.role === 'MANAGER' ||
                    session?.user?.role === 'SUPER_ADMIN' ||
                    (session?.user?.role as string) === 'GENERAL_MANAGER') && (
                    <div className="flex gap-2">
                      {availability?.unlock ? (
                        <button
                          onClick={handleLock}
                          disabled={unlocking}
                          className="px-3 py-1.5 rounded-lg text-xs border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
                        >
                          {unlocking ? 'Locking...' : 'Re-Lock'}
                        </button>
                      ) : availability?.isLocked ? (
                        <button
                          onClick={() => setShowUnlockModal(true)}
                          disabled={unlocking}
                          className="px-3 py-1.5 rounded-lg text-xs bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-500 hover:to-blue-500 transition-all"
                        >
                          Unlock
                        </button>
                      ) : null}
                    </div>
                  )}

                  {/* Submit Buttons */}
                  {!isLocked && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={saving || !hasUnsavedChanges}
                      >
                        {saving ? 'Saving...' : 'Save Draft'}
                      </button>
                      <button
                        onClick={handleSubmit}
                        className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-blue-500 transition-all whitespace-nowrap shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={saving || !hasUnsavedChanges}
                      >
                        {saving ? 'Submitting...' : 'Submit'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row: Quick Actions and Venue Deadlines */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Quick Actions */}
                {!isLocked && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Quick Actions:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllAvailable}
                        className="px-3 py-1.5 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-800 hover:border-purple-500/50 transition-all"
                        disabled={saving}
                        title="Mark all days as available"
                      >
                        All
                      </button>
                      <button
                        onClick={selectAllUnavailable}
                        className="px-3 py-1.5 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-800 hover:border-purple-500/50 transition-all"
                        disabled={saving}
                        title="Mark all days as unavailable"
                      >
                        None
                      </button>
                      <button
                        onClick={selectWeekends}
                        className="px-3 py-1.5 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-800 hover:border-purple-500/50 transition-all"
                        disabled={saving}
                        title="Mark weekends (Sat/Sun) as available"
                      >
                        Weekends
                      </button>
                      <button
                        onClick={selectWeekendsOff}
                        className="px-3 py-1.5 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-800 hover:border-purple-500/50 transition-all"
                        disabled={saving}
                        title="Mark weekdays (Mon-Fri) as available"
                      >
                        Weekdays
                      </button>
                    </div>
                  </div>
                )}

                {/* Venue Deadlines */}
                {venues.length > 0 && !isLocked && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Deadline:
                    </span>
                    {(() => {
                      // Get unique venues (deduplicate by name)
                      const uniqueVenues = Array.from(
                        new Map(venues.map((v) => [v.name, v])).values()
                      );

                      // Get earliest deadline
                      const [year, monthNum] = currentMonth
                        .split('-')
                        .map(Number);
                      const deadlines = uniqueVenues.map((v) => ({
                        venue: v,
                        date: new Date(
                          year,
                          monthNum - 1,
                          v.availabilityDeadlineDay
                        ),
                        day: v.availabilityDeadlineDay,
                      }));
                      const earliestDeadline = deadlines.sort(
                        (a, b) => a.date.getTime() - b.date.getTime()
                      )[0];
                      const isPast = new Date() > earliestDeadline.date;

                      return (
                        <div
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                            isPast
                              ? 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400'
                              : 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          } border`}
                        >
                          {isPast
                            ? 'Past due'
                            : `${monthName} ${earliestDeadline.day}`}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </PremiumCard>

          {/* Calendar Grid */}
          <PremiumCard className="mb-4">
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-center font-semibold text-xs sm:text-sm text-muted-foreground dark:text-gray-400 py-2"
                    >
                      {day}
                    </div>
                  )
                )}

                {/* Empty cells for days before month starts */}
                {Array.from({ length: days[0].getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Day cells */}
                {days.map((day) => {
                  const dateStr = formatDate(day);
                  const isAvailable = selectedDates[dateStr] || false;
                  const isToday =
                    dateStr === new Date().toISOString().split('T')[0];

                  return (
                    <button
                      key={dateStr}
                      onClick={() => toggleDate(dateStr)}
                      disabled={isLocked}
                      className={`
                        p-3 sm:p-4 rounded-lg border-2 transition-all
                        min-h-[70px] sm:min-h-[85px] flex flex-col items-center justify-center
                        ${
                          isAvailable
                            ? 'bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-300 hover:bg-green-500/30'
                            : 'bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-300 hover:bg-red-500/30'
                        }
                        ${isToday ? 'ring-2 ring-purple-500/50' : ''}
                        ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                      `}
                    >
                      <div className="text-lg sm:text-xl font-semibold leading-tight">
                        {day.getDate()}
                      </div>
                      <div className="text-xs sm:text-sm mt-1 leading-tight">
                        {isAvailable ? 'Available' : 'Unavailable'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </PremiumCard>

          {/* Toast Messages */}
          {error && (
            <Toast
              message={error}
              type="error"
              onClose={() => setError('')}
              duration={5000}
            />
          )}

          {success && (
            <Toast
              message={success}
              type="success"
              onClose={() => setSuccess('')}
              duration={3000}
            />
          )}

          {isLocked && (
            <PremiumCard className="border-yellow-500/30">
              <div className="p-3">
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-2 rounded-lg text-xs">
                  This availability period has been locked by a manager. You can
                  no longer make changes.
                </div>
              </div>
            </PremiumCard>
          )}

          {/* Unlock Modal */}
          {showUnlockModal && (
            <>
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                onClick={() => {
                  if (!unlocking) {
                    setShowUnlockModal(false);
                    setUnlockReason('');
                  }
                }}
              />
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4">
                <PremiumCard>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-foreground dark:text-gray-100">
                        Unlock Availability
                      </h3>
                      <button
                        onClick={() => {
                          setShowUnlockModal(false);
                          setUnlockReason('');
                        }}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        disabled={unlocking}
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

                    <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
                      This will allow the staff member to edit their
                      availability for{' '}
                      {new Date(currentMonth + '-01').toLocaleDateString(
                        'en-US',
                        {
                          month: 'long',
                          year: 'numeric',
                        }
                      )}
                      , even though the deadline has passed.
                    </p>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-foreground dark:text-gray-300 mb-2">
                        Reason (optional)
                      </label>
                      <textarea
                        value={unlockReason}
                        onChange={(e) => setUnlockReason(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800/50 dark:bg-gray-800/30 border border-gray-700/50 dark:border-gray-700/50 rounded-lg text-foreground dark:text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all resize-none"
                        rows={3}
                        placeholder="E.g., Emergency schedule change required"
                        disabled={unlocking}
                      />
                    </div>

                    <div className="flex justify-end gap-4">
                      <button
                        onClick={() => {
                          setShowUnlockModal(false);
                          setUnlockReason('');
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
                        disabled={unlocking}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUnlock}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-500 hover:to-blue-500 transition-all"
                        disabled={unlocking}
                      >
                        {unlocking ? 'Unlocking...' : 'Unlock'}
                      </button>
                    </div>
                  </div>
                </PremiumCard>
              </div>
            </>
          )}
        </main>
      </div>
    </PremiumLayout>
  );
}
