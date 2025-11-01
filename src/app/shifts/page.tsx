'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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
}

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  bartendersRequired: number;
  barbacksRequired: number;
  leadsRequired: number;
  venue: Venue;
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
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState('');
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
    // Check if user is a manager
    if (status === 'authenticated' && !isManager) {
      router.push('/shifts/my');
    }
  }, [status, isManager, router]);

  useEffect(() => {
    // Set default to current week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    setCurrentDate(startOfWeek.toISOString().split('T')[0]);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl+N to create new shift (only for managers)
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && isManager) {
        e.preventDefault();
        router.push('/shifts/new');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, isManager]);

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

  useEffect(() => {
    async function fetchShifts() {
      if (!currentDate) return;

      try {
        const startDate = new Date(currentDate);
        const endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + 6); // Week view

        const params = new URLSearchParams({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });

        if (selectedVenue && selectedVenue !== 'all') {
          params.append('venueId', selectedVenue);
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
    }

    if (status === 'authenticated' && currentDate) {
      fetchShifts();
    }
  }, [status, currentDate, selectedVenue]);

  function changeWeek(offset: number) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + offset * 7);
    setCurrentDate(date.toISOString().split('T')[0]);
    setLoading(true);
  }

  function getWeekDates(): Date[] {
    const start = new Date(currentDate);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  function getShiftsForDate(date: Date): Shift[] {
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

  async function handleDeleteShift(shiftId: string) {
    if (!confirm('Are you sure you want to delete this shift?')) {
      return;
    }

    try {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete shift');
      }

      // Remove from list
      setShifts(shifts.filter((s) => s.id !== shiftId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete shift');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading shifts...</p>
      </div>
    );
  }

  const weekDates = getWeekDates();
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Shift Scheduler</h1>
              <p className="text-sm text-muted-foreground">
                Manage shifts and staff assignments
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/shifts/new')}
                className="btn btn-primary"
                title="Press Cmd/Ctrl+N to create a new shift"
              >
                Create Shift
                <span className="hidden lg:inline ml-2 text-xs opacity-70">
                  ({navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+N)
                </span>
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="btn btn-outline"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => changeWeek(-1)} className="btn btn-outline">
              ← Previous Week
            </button>
            <div className="text-lg font-semibold">
              {weekStart.toLocaleDateString('default', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              -{' '}
              {weekEnd.toLocaleDateString('default', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <button onClick={() => changeWeek(1)} className="btn btn-outline">
              Next Week →
            </button>
          </div>

          <div>
            <label htmlFor="venueFilter" className="form-label">
              Filter by Venue
            </label>
            <select
              id="venueFilter"
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="input"
            >
              <option value="all">All Venues</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-6" role="alert">
            {error}
          </div>
        )}

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date) => {
            const dayShifts = getShiftsForDate(date);
            const isToday =
              date.toISOString().split('T')[0] ===
              new Date().toISOString().split('T')[0];

            return (
              <div
                key={date.toISOString()}
                className={`border border-border rounded-lg p-4 min-h-[300px] ${
                  isToday ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="font-semibold mb-2">
                  <div className="text-sm text-muted-foreground">
                    {date.toLocaleDateString('default', { weekday: 'short' })}
                  </div>
                  <div>{date.getDate()}</div>
                </div>

                <div className="space-y-2">
                  {dayShifts.map((shift) => {
                    const isFullyStaffed = isShiftFullyStaffed(shift);

                    return (
                      <div
                        key={shift.id}
                        onClick={() => router.push(`/shifts/${shift.id}`)}
                        className={`p-2 rounded border cursor-pointer hover:bg-accent transition-colors ${
                          isFullyStaffed
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-yellow-500 bg-yellow-500/10'
                        }`}
                      >
                        <div className="text-xs font-semibold text-muted-foreground">
                          {shift.venue.name}
                        </div>
                        <div className="text-sm font-medium">
                          {shift.startTime} - {shift.endTime}
                        </div>
                        <div className="text-xs mt-1">
                          {shift._count.assignments} /{' '}
                          {shift.bartendersRequired + shift.barbacksRequired}{' '}
                          staff
                        </div>
                        {!isFullyStaffed && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            Needs staff
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {shifts.length === 0 && (
          <div className="card mt-6">
            <div className="card-content text-center py-12">
              <p className="text-muted-foreground mb-4">
                No shifts scheduled for this week
              </p>
              <button
                onClick={() => router.push('/shifts/new')}
                className="btn btn-primary"
              >
                Create Your First Shift
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
