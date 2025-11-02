'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserMenu } from '@/components/user-menu';
import { formatTime12Hour } from '@/lib/utils';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { Breadcrumb } from '@/components/breadcrumb';

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
      isLead: boolean;
    };
    role: string;
    isLead: boolean;
  }>;
}

interface StaffDashboardProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
}

export function StaffDashboard({ user }: StaffDashboardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [monthShifts, setMonthShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchShifts() {
      if (status !== 'authenticated' || !session?.user?.id) return;

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch today's shifts
        const todayParams = new URLSearchParams({
          startDate: today.toISOString().split('T')[0],
          endDate: tomorrow.toISOString().split('T')[0],
          userId: session.user.id,
        });

        const todayResponse = await fetch(`/api/shifts?${todayParams}`);
        if (todayResponse.ok) {
          const todayData = await todayResponse.json();
          // Deduplicate shifts by ID to prevent double rendering
          const uniqueShifts = todayData.filter(
            (shift: Shift, index: number, self: Shift[]) =>
              index === self.findIndex((s: Shift) => s.id === shift.id)
          );
          setTodayShifts(uniqueShifts);
        }

        // Fetch month shifts
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

        const monthParams = new URLSearchParams({
          startDate: monthStart.toISOString().split('T')[0],
          endDate: monthEnd.toISOString().split('T')[0],
          userId: session.user.id,
        });

        const monthResponse = await fetch(`/api/shifts?${monthParams}`);
        if (monthResponse.ok) {
          const monthData = await monthResponse.json();
          // Deduplicate shifts by ID to prevent double rendering
          const uniqueShifts = monthData.filter(
            (shift: Shift, index: number, self: Shift[]) =>
              index === self.findIndex((s: Shift) => s.id === shift.id)
          );
          setMonthShifts(uniqueShifts);
        }
      } catch (error) {
        console.error('Error fetching shifts:', error);
      } finally {
        setLoading(false);
        setMonthLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchShifts();

      // Fetch unread notifications count
      if (session?.user?.id) {
        fetch('/api/notifications?limit=1&offset=0&unreadOnly=true')
          .then((res) => res.json())
          .then((data) => {
            setUnreadNotifications(data.unreadCount || 0);
          })
          .catch(() => {
            // Silently fail - notifications are optional
          });
      }
    }
  }, [status, session?.user?.id, currentMonth]);

  function getMyAssignment(shift: Shift) {
    if (!session?.user?.id) return null;
    return shift.assignments.find((a) => a.user.id === session.user.id);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatDateShort(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  function formatWeekday(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  function isToday(dateStr: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shiftDate = new Date(dateStr);
    shiftDate.setHours(0, 0, 0, 0);
    return (
      today.getDate() === shiftDate.getDate() &&
      today.getMonth() === shiftDate.getMonth() &&
      today.getFullYear() === shiftDate.getFullYear()
    );
  }

  function getShiftsForDay(date: Date): Shift[] {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    const shiftsForDay = monthShifts.filter((shift) => {
      const shiftDate = new Date(shift.date);
      return shiftDate.toISOString().split('T')[0] === dateStr;
    });

    // Deduplicate shifts by ID (in case of API duplicates)
    const seenIds = new Set<string>();
    return shiftsForDay.filter((shift) => {
      if (seenIds.has(shift.id)) {
        return false;
      }
      seenIds.add(shift.id);
      return true;
    });
  }

  function navigateMonth(direction: number) {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
    setMonthLoading(true);
  }

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Get calendar days for current month
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

  if (loading && todayShifts.length === 0 && monthShifts.length === 0) {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </PremiumLayout>
    );
  }

  return (
    <PremiumLayout>
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  My Schedule
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumb />

          {/* Overview Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Today's Shifts Count */}
            <PremiumCard>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">
                      Today&apos;s Shifts
                    </p>
                    <p className="text-2xl font-bold text-gray-100">
                      {todayShifts.length}
                    </p>
                  </div>
                  <div className="text-2xl">📅</div>
                </div>
              </div>
            </PremiumCard>

            {/* Unread Notifications */}
            <PremiumCard>
              <div className="p-4">
                <Link href="/notifications" className="block">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">
                        Unread Notifications
                      </p>
                      <p className="text-2xl font-bold text-gray-100">
                        {unreadNotifications}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl">🔔</div>
                      {unreadNotifications > 0 && (
                        <svg
                          className="w-4 h-4 text-purple-400"
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
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            </PremiumCard>
          </div>

          {/* Today's Shifts - Prominent Section */}
          <div className="mb-4">
            <PremiumCard>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-100">
                    Today&apos;s Schedule
                  </h2>
                  <span className="text-xs font-medium text-gray-400">
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {todayShifts.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400 mb-1">
                      No shifts scheduled for today
                    </p>
                    <p className="text-xs text-gray-500">
                      Enjoy your day off! 🎉
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayShifts.map((shift) => {
                      const assignment = getMyAssignment(shift);
                      if (!assignment) return null;

                      return (
                        <Link
                          key={shift.id}
                          href={`/shifts/${shift.id}`}
                          className="block p-3 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-purple-500/30 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-base font-semibold text-gray-100">
                                  {shift.venue.name}
                                </h3>
                                {assignment.isLead && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                    Lead
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1.5 text-gray-300">
                                  <span className="text-xs">⏰</span>
                                  <span className="font-medium">
                                    {formatTime12Hour(shift.startTime)}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-400">
                                  {assignment.role}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <svg
                                className="w-5 h-5 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all"
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
          </div>

          {/* Full Month View */}
          <PremiumCard>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-100">
                  Monthly View
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                    aria-label="Previous month"
                  >
                    <svg
                      className="w-5 h-5 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <span className="text-base font-medium text-gray-100 min-w-[150px] text-center">
                    {monthName}
                  </span>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                    aria-label="Next month"
                  >
                    <svg
                      className="w-5 h-5 text-gray-300"
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
                  </button>
                </div>
              </div>
              {monthLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
                  <p className="text-xs text-gray-400">Loading...</p>
                </div>
              ) : monthShifts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400">
                    No shifts scheduled for this month
                  </p>
                </div>
              ) : (
                <div>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-medium text-gray-400 py-1"
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {getCalendarDays().map((date, idx) => {
                      if (!date) {
                        return <div key={idx} className="p-1"></div>;
                      }

                      const dayShifts = getShiftsForDay(date);
                      const dateStr = date.toISOString().split('T')[0];
                      const isTodayDate = isToday(dateStr);

                      return (
                        <div
                          key={idx}
                          className={`min-h-[60px] p-1 rounded border ${
                            isTodayDate
                              ? 'border-purple-500/50 bg-purple-500/10'
                              : 'border-gray-800 bg-gray-800/20'
                          }`}
                        >
                          <div
                            className={`text-xs font-medium mb-0.5 ${
                              isTodayDate ? 'text-purple-400' : 'text-gray-300'
                            }`}
                          >
                            {date.getDate()}
                          </div>
                          <div className="space-y-0.5">
                            {dayShifts.slice(0, 2).map((shift) => {
                              const assignment = getMyAssignment(shift);
                              if (!assignment) return null;

                              return (
                                <Link
                                  key={shift.id}
                                  href={`/shifts/${shift.id}`}
                                  className="block text-[10px] p-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 transition-colors truncate"
                                  title={`${shift.venue.name} ${formatTime12Hour(shift.startTime)}`}
                                >
                                  <div className="truncate font-medium text-gray-200">
                                    {shift.venue.name}
                                  </div>
                                  <div className="truncate text-gray-400">
                                    {formatTime12Hour(shift.startTime)}
                                  </div>
                                </Link>
                              );
                            })}
                            {dayShifts.length > 2 && (
                              <div className="text-[10px] text-gray-500 text-center">
                                +{dayShifts.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </PremiumCard>

          {/* Quick Actions - Hidden below fold, can scroll */}
          <div className="mt-4">
            <PremiumCard>
              <div className="p-4">
                <h2 className="text-base font-semibold text-gray-100 mb-3">
                  Quick Actions
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Link
                    href="/availability"
                    className="p-3 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-purple-500/30 transition-all text-center group"
                  >
                    <div className="text-xl mb-1">📅</div>
                    <div className="text-xs font-medium text-gray-200 group-hover:text-white">
                      Availability
                    </div>
                  </Link>

                  <Link
                    href="/trades"
                    className="p-3 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-purple-500/30 transition-all text-center group"
                  >
                    <div className="text-xl mb-1">🔄</div>
                    <div className="text-xs font-medium text-gray-200 group-hover:text-white">
                      Shift Trades
                    </div>
                  </Link>

                  <Link
                    href="/reports"
                    className="p-3 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-purple-500/30 transition-all text-center group"
                  >
                    <div className="text-xl mb-1">📊</div>
                    <div className="text-xs font-medium text-gray-200 group-hover:text-white">
                      User Reports
                    </div>
                  </Link>

                  <Link
                    href="/notifications"
                    className="p-3 rounded-lg border border-gray-800 bg-gray-800/30 hover:bg-gray-800/50 hover:border-purple-500/30 transition-all text-center group"
                  >
                    <div className="text-xl mb-1">🔔</div>
                    <div className="text-xs font-medium text-gray-200 group-hover:text-white">
                      Notifications
                    </div>
                  </Link>
                </div>
              </div>
            </PremiumCard>
          </div>
        </main>
      </div>
    </PremiumLayout>
  );
}
