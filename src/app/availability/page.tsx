'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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
      setSuccess('Availability saved successfully!');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save availability'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (
      !confirm(
        'Are you sure you want to submit your availability? You may not be able to change it after the deadline.'
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
      setSuccess('Availability submitted successfully!');

      setTimeout(() => setSuccess(''), 3000);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading availability...</p>
      </div>
    );
  }

  const days = getDaysInMonth(currentMonth);
  const [year, month] = currentMonth.split('-');
  const monthName = new Date(
    parseInt(year),
    parseInt(month) - 1
  ).toLocaleString('default', { month: 'long', year: 'numeric' });

  const isLocked = availability?.isLocked || false;
  const isSubmitted = availability?.submittedAt !== null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Availability Calendar</h1>
              <p className="text-sm text-muted-foreground">
                Mark the days you&apos;re available to work
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
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="btn btn-outline text-xs sm:text-sm"
            disabled={saving}
          >
            <span className="hidden sm:inline">← Previous Month</span>
            <span className="sm:hidden">← Prev</span>
          </button>
          <h2 className="text-lg sm:text-xl font-semibold">{monthName}</h2>
          <button
            onClick={() => changeMonth(1)}
            className="btn btn-outline text-xs sm:text-sm"
            disabled={saving}
          >
            <span className="hidden sm:inline">Next Month →</span>
            <span className="sm:hidden">Next →</span>
          </button>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2 mb-6 flex-wrap items-center">
          {isLocked && <span className="badge badge-error">Locked</span>}
          {isSubmitted && !isLocked && (
            <span className="badge badge-success">Submitted</span>
          )}
          {!isSubmitted && !isLocked && (
            <span className="badge badge-warning">Draft</span>
          )}

          {/* Unlock Status */}
          {availability?.unlock && (
            <span className="badge badge-info">
              Unlocked by {availability.unlock.manager.name}
            </span>
          )}

          {/* Manager Unlock/Lock Buttons */}
          {(session?.user?.role === 'MANAGER' ||
            session?.user?.role === 'SUPER_ADMIN') && (
            <div className="ml-auto flex gap-2">
              {availability?.unlock ? (
                <button
                  onClick={handleLock}
                  disabled={unlocking}
                  className="btn btn-sm btn-outline"
                >
                  {unlocking ? 'Locking...' : 'Re-Lock'}
                </button>
              ) : availability?.lockedAt ? (
                <button
                  onClick={() => setShowUnlockModal(true)}
                  disabled={unlocking}
                  className="btn btn-sm btn-primary"
                >
                  Unlock Availability
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Venue Deadline Indicators */}
        {venues.length > 0 && !isLocked && (
          <div className="card mb-6">
            <div className="card-header">
              <h3 className="font-semibold">Venue Deadlines</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Submit your availability before these dates
              </p>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {venues.map((venue) => {
                  const [year, monthNum] = currentMonth.split('-').map(Number);
                  const deadlineDate = new Date(
                    year,
                    monthNum - 1,
                    venue.availabilityDeadlineDay
                  );
                  const isPast = new Date() > deadlineDate;

                  return (
                    <div
                      key={venue.id}
                      className={`p-3 rounded-lg border ${
                        isPast
                          ? 'border-error/50 bg-error/10'
                          : 'border-warning/50 bg-warning/10'
                      }`}
                    >
                      <div className="font-medium">{venue.name}</div>
                      <div
                        className={`text-sm mt-1 ${
                          isPast ? 'text-error' : 'text-warning'
                        }`}
                      >
                        {isPast
                          ? 'Past due'
                          : `Due by ${monthName} ${venue.availabilityDeadlineDay}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {!isLocked && (
          <div className="card mb-6">
            <div className="card-header">
              <h3 className="font-semibold">Quick Actions</h3>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
                <button
                  onClick={selectAllAvailable}
                  className="btn btn-outline w-full sm:w-auto"
                  disabled={saving}
                >
                  Select All Available
                </button>
                <button
                  onClick={selectAllUnavailable}
                  className="btn btn-outline w-full sm:w-auto"
                  disabled={saving}
                >
                  Select All Unavailable
                </button>
                <button
                  onClick={selectWeekends}
                  className="btn btn-outline w-full sm:w-auto"
                  disabled={saving}
                >
                  Select Weekends
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="card mb-6">
          <div className="card-content">
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-xs sm:text-sm text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}

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
                      p-2 sm:p-4 rounded-lg border-2 transition-colors touch-feedback
                      min-h-[60px] sm:min-h-[80px]
                      ${isAvailable ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300' : 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300'}
                      ${isToday ? 'ring-2 ring-primary' : ''}
                      ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer active:scale-95'}
                    `}
                  >
                    <div className="text-base sm:text-lg font-semibold">
                      {day.getDate()}
                    </div>
                    <div className="text-[10px] sm:text-xs mt-1">
                      {isAvailable ? 'Available' : 'Unavailable'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="alert alert-error mb-6" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success mb-6" role="alert">
            {success}
          </div>
        )}

        {/* Action Buttons */}
        {!isLocked && (
          <div className="flex justify-end gap-4">
            <button
              onClick={handleSave}
              className="btn btn-outline"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Submitting...' : 'Submit Availability'}
            </button>
          </div>
        )}

        {isLocked && (
          <div className="alert alert-warning" role="alert">
            This availability period has been locked by a manager. You can no
            longer make changes.
          </div>
        )}
      </main>

      {/* Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Unlock Availability</h3>

            <p className="text-sm text-muted-foreground mb-4">
              This will allow the staff member to edit their availability for{' '}
              {new Date(currentMonth + '-01').toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
              , even though the deadline has passed.
            </p>

            <div className="mb-4">
              <label className="form-label">Reason (optional)</label>
              <textarea
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                className="input w-full"
                rows={3}
                placeholder="E.g., Emergency schedule change required"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowUnlockModal(false);
                  setUnlockReason('');
                }}
                className="btn btn-outline"
                disabled={unlocking}
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock}
                className="btn btn-primary"
                disabled={unlocking}
              >
                {unlocking ? 'Unlocking...' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
