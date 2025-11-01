/**
 * Client-side push notification utilities
 */

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Convert base64 URL to Uint8Array (required for push subscription)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[Push] Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('[Push] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Request push notification permission
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications are not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    // Get VAPID public key from environment or API
    // In production, this should come from your backend
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      console.warn('[Push] VAPID public key not configured');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        vapidPublicKey
      ) as BufferSource,
    });

    const subscriptionData: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!),
      },
    };

    return subscriptionData;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return null;
  }
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Register push subscription with backend
 */
export async function registerPushSubscription(
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const response = await fetch('/api/push/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });

    if (!response.ok) {
      throw new Error('Failed to register subscription');
    }

    console.log('[Push] Subscription registered with backend');
    return true;
  } catch (error) {
    console.error('[Push] Failed to register subscription:', error);
    return false;
  }
}

/**
 * Unregister push subscription
 */
export async function unregisterPushSubscription(
  endpoint: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/push/register?endpoint=${encodeURIComponent(endpoint)}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to unregister subscription');
    }

    console.log('[Push] Subscription unregistered');
    return true;
  } catch (error) {
    console.error('[Push] Failed to unregister subscription:', error);
    return false;
  }
}

/**
 * Initialize push notifications (call this on app load)
 */
export async function initializePushNotifications(): Promise<boolean> {
  try {
    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return false;
    }

    // Request permission
    const permission = await requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Permission not granted:', permission);
      return false;
    }

    // Check if already subscribed
    const existingSubscription =
      await registration.pushManager.getSubscription();
    if (existingSubscription) {
      const subscriptionData: PushSubscription = {
        endpoint: existingSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(existingSubscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(existingSubscription.getKey('auth')!),
        },
      };
      await registerPushSubscription(subscriptionData);
      return true;
    }

    // Subscribe to push
    const subscription = await subscribeToPush(registration);
    if (!subscription) {
      return false;
    }

    // Register with backend
    const registered = await registerPushSubscription(subscription);
    return registered;
  } catch (error) {
    console.error('[Push] Initialization failed:', error);
    return false;
  }
}
