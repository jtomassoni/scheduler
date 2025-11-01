'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { initializePushNotifications } from '@/lib/push-notifications';

/**
 * Component to initialize push notifications when user is authenticated
 * Add this to your layout or dashboard
 */
export function PushNotificationInit() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Initialize push notifications (will request permission if needed)
      initializePushNotifications().catch((error) => {
        console.error('[Push] Failed to initialize:', error);
      });
    }
  }, [status, session]);

  return null; // This component doesn't render anything
}
