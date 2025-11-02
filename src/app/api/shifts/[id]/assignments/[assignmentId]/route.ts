import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateAssignmentSchema = z.object({
  isOnCall: z.boolean().optional(),
});

/**
 * PATCH /api/shifts/[id]/assignments/[assignmentId]
 * Update assignment properties (e.g., on-call status)
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id: string; assignmentId: string }>
      | { id: string; assignmentId: string };
  }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can update assignments
    if (!isManager(session.user.role) && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle params which might be a Promise in Next.js App Router
    const resolvedParams = params instanceof Promise ? await params : params;
    const { assignmentId } = resolvedParams;

    const body = await request.json();
    const validatedData = updateAssignmentSchema.parse(body);

    // Verify assignment exists and belongs to a shift
    const assignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        shift: true,
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
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Update assignment
    const updated = await prisma.shiftAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(validatedData.isOnCall !== undefined && {
          isOnCall: validatedData.isOnCall,
        }),
      },
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
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating shift assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update shift assignment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shifts/[id]/assignments/[assignmentId]
 * Remove a user from a shift (Manager or Super Admin only)
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id: string; assignmentId: string }>
      | { id: string; assignmentId: string };
  }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can remove assignments
    if (!isManager(session.user.role) && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle params which might be a Promise in Next.js App Router
    const resolvedParams = params instanceof Promise ? await params : params;
    const { assignmentId } = resolvedParams;

    await prisma.shiftAssignment.delete({
      where: { id: assignmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete shift assignment' },
      { status: 500 }
    );
  }
}
