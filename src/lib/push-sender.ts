/**
 * Push notification sender utility
 *
 * This module handles sending push notifications to registered users.
 * Requires web-push library and VAPID keys to be configured.
 *
 * Installation:
 * npm install web-push
 *
 * Setup:
 * 1. Generate VAPID keys: npx web-push generate-vapid-keys
 * 2. Set environment variables:
 *    - VAPID_PUBLIC_KEY
 *    - VAPID_PRIVATE_KEY
 *    - VAPID_SUBJECT (mailto:your-email@example.com)
 */

import { prisma } from './prisma';

// Uncomment when web-push is installed:
// import webpush from 'web-push';

export interface PushNotificationPayload {
  title: string;
  message: string;
  data?: Record<string, unknown>;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Send push notification to a user's registered subscriptions
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    // Get user's push subscriptions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notificationPrefs: true,
      },
    });

    if (!user) {
      return false;
    }

    const notificationPrefs = (user.notificationPrefs as any) || {};
    const pushSubscriptions = notificationPrefs.pushSubscriptions || [];

    if (pushSubscriptions.length === 0) {
      return false;
    }

    // Check if push notifications are enabled
    const pushEnabled = notificationPrefs.push ?? true;
    if (!pushEnabled) {
      return false;
    }

    // TODO: Uncomment when web-push is installed and configured
    /*
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT;

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      console.error('[Push] VAPID keys not configured');
      return false;
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.message,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-96x96.png',
      tag: payload.tag || 'notification',
      data: payload.data || {},
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [],
    });

    const sendPromises = pushSubscriptions.map(async (subscription: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
          notificationPayload
        );
        return true;
      } catch (error: any) {
        // If subscription is invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('[Push] Removing invalid subscription:', subscription.endpoint);
          // Remove invalid subscription
          const updatedSubscriptions = pushSubscriptions.filter(
            (sub: any) => sub.endpoint !== subscription.endpoint
          );
          await prisma.user.update({
            where: { id: userId },
            data: {
              notificationPrefs: {
                ...notificationPrefs,
                pushSubscriptions: updatedSubscriptions,
              },
            },
          });
        }
        console.error('[Push] Failed to send notification:', error);
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    return results.some((r) => r === true);
    */

    // Placeholder: log that push would be sent
    console.log(`[Push] Would send push to user ${userId}:`, payload);
    return true;
  } catch (error) {
    console.error('[Push] Error sending push notification:', error);
    return false;
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationBulk(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<number> {
  const results = await Promise.all(
    userIds.map((userId) => sendPushNotification(userId, payload))
  );
  return results.filter((r) => r === true).length;
}
