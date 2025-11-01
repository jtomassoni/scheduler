import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

/**
 * POST /api/push/register
 * Register a user's push notification subscription
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = subscriptionSchema.parse(body);

    // Store or update push subscription
    // In a real implementation, you'd want a PushSubscription model
    // For now, we'll store it in the user's notificationPrefs JSON field
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { notificationPrefs: true },
    });

    const notificationPrefs = (user?.notificationPrefs as any) || {};
    const pushSubscriptions = notificationPrefs.pushSubscriptions || [];

    // Check if subscription already exists
    const existingIndex = pushSubscriptions.findIndex(
      (sub: any) => sub.endpoint === validatedData.endpoint
    );

    const subscription = {
      endpoint: validatedData.endpoint,
      keys: validatedData.keys,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      pushSubscriptions[existingIndex] = subscription;
    } else {
      pushSubscriptions.push(subscription);
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        notificationPrefs: {
          ...notificationPrefs,
          pushSubscriptions,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error registering push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to register push subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/register?endpoint=xxx
 * Unregister a push notification subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'endpoint parameter is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { notificationPrefs: true },
    });

    const notificationPrefs = (user?.notificationPrefs as any) || {};
    const pushSubscriptions = (
      notificationPrefs.pushSubscriptions || []
    ).filter((sub: any) => sub.endpoint !== endpoint);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        notificationPrefs: {
          ...notificationPrefs,
          pushSubscriptions,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unregistering push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to unregister push subscription' },
      { status: 500 }
    );
  }
}
