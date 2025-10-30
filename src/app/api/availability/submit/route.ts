import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/availability/submit
 * Submit availability for a month (marks it as submitted)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { month } = await request.json();

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM' },
        { status: 400 }
      );
    }

    // Check if availability exists
    const existing = await prisma.availability.findUnique({
      where: {
        userId_month: {
          userId: session.user.id,
          month,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'No availability data found for this month' },
        { status: 404 }
      );
    }

    if (existing.isLocked) {
      return NextResponse.json(
        { error: 'Availability is already locked' },
        { status: 400 }
      );
    }

    // Update to mark as submitted
    const availability = await prisma.availability.update({
      where: {
        userId_month: {
          userId: session.user.id,
          month,
        },
      },
      data: {
        submittedAt: new Date(),
      },
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error submitting availability:', error);
    return NextResponse.json(
      { error: 'Failed to submit availability' },
      { status: 500 }
    );
  }
}
