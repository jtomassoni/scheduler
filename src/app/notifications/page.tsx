'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';
import { Breadcrumb } from '@/components/breadcrumb';
import { Toast } from '@/components/toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  sentAt: string;
  readAt: string | null;
  data: Record<string, unknown> | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, filter]);

  async function fetchNotifications() {
    setLoading(true);
    setError('');

    try {
      const unreadOnly = filter === 'unread';
      const response = await fetch(
        `/api/notifications?limit=100&offset=0&unreadOnly=${unreadOnly}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch notifications'
      );
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const response = await fetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read: true, readAt: new Date().toISOString() }
            : n
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to mark notification as read'
      );
    }
  }

  async function markAllAsRead() {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
          readAt: new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to mark all notifications as read'
      );
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'AVAILABILITY_REMINDER':
      case 'AVAILABILITY_DEADLINE':
        return '📅';
      case 'SHIFT_ASSIGNED':
      case 'SHIFT_CHANGED':
        return '📋';
      case 'TRADE_PROPOSED':
      case 'TRADE_UPDATED':
        return '🔄';
      case 'OVERRIDE_REQUESTED':
      case 'OVERRIDE_APPROVED':
        return '⚠️';
      case 'TIP_PUBLISHED':
      case 'TIP_UPDATED':
        return '💰';
      default:
        return '🔔';
    }
  }

  if (status === 'loading') {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading notifications...</p>
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
                  Notifications
                </h1>
                <p className="text-xs text-gray-400 mt-1">
                  {unreadCount > 0
                    ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                    : 'All caught up!'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 font-medium hover:bg-gray-800 transition-all text-sm"
                >
                  Back to Dashboard
                </button>
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumb />
          {/* Filter and Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === 'unread'
                    ? 'bg-purple-600 text-white'
                    : 'border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 font-medium hover:bg-gray-800 transition-all text-sm"
              >
                Mark All as Read
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Toast
              message={error}
              type="error"
              onClose={() => setError('')}
              duration={5000}
            />
          )}

          {/* Notifications List */}
          <div className="space-y-3">
            {loading ? (
              <PremiumCard>
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading notifications...</p>
                </div>
              </PremiumCard>
            ) : notifications.length === 0 ? (
              <PremiumCard>
                <div className="p-8 text-center">
                  <p className="text-gray-400">
                    {filter === 'unread'
                      ? 'No unread notifications'
                      : 'No notifications yet'}
                  </p>
                </div>
              </PremiumCard>
            ) : (
              notifications.map((notification) => (
                <PremiumCard
                  key={notification.id}
                  className={`transition-all hover:border-purple-500/30 ${
                    !notification.read
                      ? 'border-purple-500/20 bg-purple-500/5'
                      : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className={`text-base font-semibold ${
                              !notification.read
                                ? 'text-purple-300'
                                : 'text-gray-200'
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="inline-block w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 mt-2" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500">
                            {new Date(notification.sentAt).toLocaleString(
                              'default',
                              {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              }
                            )}
                          </p>
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="px-3 py-1 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 text-xs font-medium hover:bg-gray-800 hover:border-purple-500/50 transition-all"
                            >
                              Mark as Read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </PremiumCard>
              ))
            )}
          </div>
        </main>
      </div>
    </PremiumLayout>
  );
}
