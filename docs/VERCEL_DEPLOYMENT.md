# Vercel Deployment Guide

## Push Notifications Setup

### Prerequisites

1. **Install web-push package** (for production):

   ```bash
   npm install web-push
   ```

2. **Generate VAPID keys**:

   ```bash
   npx web-push generate-vapid-keys
   ```

   This will output:
   - Public Key: `BL...` (use this as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`)
   - Private Key: `--` (use this as `VAPID_PRIVATE_KEY` - keep secret!)

### Environment Variables

Add these to your Vercel project settings (Settings → Environment Variables):

#### Required for Push Notifications:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Your VAPID public key (starts with `BL...`)
- `VAPID_PRIVATE_KEY` - Your VAPID private key (keep secret!)
- `VAPID_SUBJECT` - Email address for VAPID (e.g., `mailto:your-email@example.com`)

#### Required for Database:

- `DATABASE_URL` - Your PostgreSQL connection string

#### Required for NextAuth:

- `NEXTAUTH_URL` - Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
- `NEXTAUTH_SECRET` - A random secret string (generate with `openssl rand -base64 32`)

### Enable Push Notifications

1. **Uncomment web-push code** in `src/lib/push-sender.ts`:
   - Remove the `/* TODO: Uncomment... */` comment block
   - Uncomment the `import webpush from 'web-push';` line
   - Uncomment all the web-push code inside `sendPushNotification` function

2. **Add PushNotificationInit component** to your app:
   - In `src/app/layout.tsx` or `src/app/dashboard/page.tsx`, add:

   ```tsx
   import { PushNotificationInit } from '@/components/push-notification-init';

   // In your component:
   <PushNotificationInit />;
   ```

### Service Worker

The service worker (`public/sw.js`) is automatically served by Vercel from the `public` folder. The `vercel.json` configuration ensures proper headers are set.

### HTTPS

Vercel automatically provides HTTPS, which is required for:

- Service workers
- Push notifications
- Secure web APIs

### Testing Push Notifications

1. Deploy to Vercel
2. Visit your app (must be HTTPS)
3. Allow notifications when prompted
4. Test by creating a shift assignment or trade proposal

### Troubleshooting

**Service worker not registering:**

- Ensure you're accessing via HTTPS
- Check browser console for errors
- Verify `public/sw.js` exists and is accessible

**Push notifications not working:**

- Verify VAPID keys are set correctly
- Check that `web-push` package is installed
- Ensure code is uncommented in `push-sender.ts`
- Check browser notification permissions

**VAPID key errors:**

- Ensure keys are generated correctly
- Verify environment variables are set in Vercel
- Make sure `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is accessible client-side

### Additional Notes

- Push notifications require user permission (browser will prompt)
- Service workers are automatically updated when you deploy
- Invalid push subscriptions are automatically cleaned up
- Push notifications respect user quiet hours settings
