import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { autoFillShift } from '@/lib/auto-fill-shifts';

/**
 * POST /api/shifts/[id]/auto-assign
 * Auto-assign staff to a single shift based on availability and rankings
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can auto-assign
    if (!isManager(session.user.role) && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only managers can auto-assign staff' },
        { status: 403 }
      );
    }

    // Handle params which might be a Promise in Next.js App Router
    const resolvedParams = params instanceof Promise ? await params : params;
    const shiftId = resolvedParams.id;

    if (!shiftId) {
      return NextResponse.json(
        { error: 'Shift ID is required' },
        { status: 400 }
      );
    }

    // Get the shift details
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: {
        id: true,
        venueId: true,
        date: true,
        startTime: true,
        endTime: true,
        bartendersRequired: true,
        barbacksRequired: true,
        leadsRequired: true,
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Call autoFillShift to assign eligible staff
    const result = await autoFillShift({
      shiftId: shift.id,
      venueId: shift.venueId,
      date: new Date(shift.date),
      startTime: shift.startTime,
      endTime: shift.endTime,
      bartendersRequired: shift.bartendersRequired,
      barbacksRequired: shift.barbacksRequired,
      leadsRequired: shift.leadsRequired,
    });

    // Return the updated shift with assignments
    const updatedShift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            tipPoolEnabled: true,
            isNetworked: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isLead: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: `Auto-assigned ${result.assigned} staff member(s)`,
      assigned: result.assigned,
      summary: result.summary,
      shift: updatedShift,
    });
  } catch (error) {
    console.error('Error auto-assigning staff:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to auto-assign staff',
      },
      { status: 500 }
    );
  }
}
