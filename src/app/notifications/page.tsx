'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                  : 'All caught up!'}
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
        {/* Filter and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-outline'}`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="btn btn-outline">
              Mark All as Read
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-6" role="alert">
            {error}
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-2">
          {loading ? (
            <div className="card">
              <div className="card-content text-center py-8">
                <p className="text-muted-foreground">
                  Loading notifications...
                </p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="card">
              <div className="card-content text-center py-8">
                <p className="text-muted-foreground">
                  {filter === 'unread'
                    ? 'No unread notifications'
                    : 'No notifications yet'}
                </p>
              </div>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`card cursor-pointer transition-colors ${
                  !notification.read ? 'bg-accent/50' : ''
                }`}
                onClick={() =>
                  !notification.read && markAsRead(notification.id)
                }
              >
                <div className="card-content py-4">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`font-semibold ${!notification.read ? 'text-primary' : ''}`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="inline-block w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
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
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
