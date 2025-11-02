import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Service for creating and managing notifications
 */
export class NotificationService {
  /**
   * Create a new notification for a user
   */
  static async create(params: CreateNotificationParams) {
    const { userId, type, title, message, data } = params;

    // Check user's notification preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notificationPrefs: true,
      },
    });

    // Default to enabled if no preferences set
    const prefs = user?.notificationPrefs as {
      email?: boolean;
      push?: boolean;
    } | null;

    // Check if notifications are disabled
    if (prefs?.email === false && prefs?.push === false) {
      return null; // User has disabled all notifications
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? (data as any) : undefined,
      },
    });

    // TODO: Send email if email notifications enabled
    // TODO: Send push notification if push notifications enabled

    return notification;
  }

  /**
   * Create notifications for multiple users
   */
  static async createBulk(
    userIds: string[],
    params: Omit<CreateNotificationParams, 'userId'>
  ) {
    const notifications = await Promise.all(
      userIds.map((userId) =>
        this.create({
          userId,
          ...params,
        })
      )
    );

    return notifications.filter((n) => n !== null);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.update({
      where: {
        id: notificationId,
        userId, // Ensure user owns this notification
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    }
  ) {
    const { limit = 50, offset = 0, unreadOnly = false } = options || {};

    return await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false }),
      },
      orderBy: {
        sentAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }
}
