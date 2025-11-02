import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { shiftAssignmentSchema } from '@/lib/validations';
import { z } from 'zod';
import { NotificationService } from '@/lib/notification-service';

/**
 * POST /api/shifts/[id]/assignments
 * Assign a user to a shift (Manager or Super Admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can assign shifts
    if (!isManager(session.user.role) && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const overrideId = body.overrideId; // Optional override ID to bypass validation
    const bypassValidation = body.bypassValidation === true; // Allow super admin to bypass

    // Validate request body
    const validatedData = shiftAssignmentSchema.parse({
      ...body,
      shiftId: params.id,
    });

    // Verify shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: params.id },
      include: {
        assignments: true,
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

    // Verify user exists and get their details
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: {
        id: true,
        name: true,
        role: true,
        isLead: true,
        hasDayJob: true,
        dayJobCutoff: true,
        preferredVenuesOrder: true,
        availabilities: {
          where: {
            month: shift.date.toISOString().slice(0, 7), // YYYY-MM format
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is super admin (can bypass validation)
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

    // Check if there's an active override
    let hasActiveOverride = false;
    if (overrideId) {
      const override = await prisma.override.findUnique({
        where: { id: overrideId },
      });

      if (override && override.status === 'ACTIVE') {
        hasActiveOverride = true;
      }
    }

    // Validation checks (skip if override is active or super admin bypasses)
    const errors: Array<{
      field: string;
      message: string;
      suggestion: string;
      violationType?: string;
    }> = [];

    // Check if user is eligible for this venue
    // Users must have the venue in their preferredVenuesOrder to be assigned
    if (!hasActiveOverride && !(isSuperAdmin && bypassValidation)) {
      const userPreferredVenues = user.preferredVenuesOrder || [];
      if (!userPreferredVenues.includes(shift.venue.id)) {
        errors.push({
          field: 'userId',
          message: `User is not eligible to work at ${shift.venue.name}. Only staff assigned to this venue can be scheduled.`,
          suggestion: 'Select a user who works at this venue',
          violationType: 'venue_mismatch',
        });
      }
    }

    // If there's an active override or super admin bypasses, skip validation checks
    if (hasActiveOverride || (isSuperAdmin && bypassValidation)) {
      // Create the assignment directly
      const assignment = await prisma.shiftAssignment.create({
        data: {
          shiftId: params.id,
          userId: validatedData.userId,
          role: validatedData.role,
          isLead: validatedData.isLead,
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

      return NextResponse.json(assignment, { status: 201 });
    }

    // Check if user is already assigned to this shift
    const existingAssignment = shift.assignments.find(
      (a) => a.userId === validatedData.userId
    );
    if (existingAssignment) {
      errors.push({
        field: 'userId',
        message: 'User is already assigned to this shift',
        suggestion: 'Select a different user',
      });
    }

    // Note: Venue eligibility check is done above, before other validations

    // Check if lead assignment is valid (only bartenders can be leads)
    if (validatedData.isLead && validatedData.role !== 'BARTENDER') {
      errors.push({
        field: 'isLead',
        message: 'Only bartenders can be assigned as leads',
        suggestion: 'Remove lead designation',
      });
    }

    // Check day job cutoff
    if (user.hasDayJob && user.dayJobCutoff) {
      const shiftStartTime = shift.startTime;
      if (shiftStartTime < user.dayJobCutoff) {
        errors.push({
          field: 'userId',
          message: `User has a day job and is not available before ${user.dayJobCutoff}`,
          suggestion: 'Select a different user or request an override',
          violationType: 'cutoff',
        });
      }
    }

    // Check availability
    const availability = user.availabilities[0];
    if (availability && availability.data) {
      const dateStr = shift.date.toISOString().split('T')[0];
      const dayAvailability = (
        availability.data as Record<string, { available: boolean }>
      )[dateStr];
      if (dayAvailability && !dayAvailability.available) {
        errors.push({
          field: 'userId',
          message: 'User marked themselves unavailable for this date',
          suggestion: 'Select a different user or request an override',
          violationType: 'request_off',
        });
      }
    }

    // Check for double-booking (overlapping shifts on same date)
    const dateStart = new Date(shift.date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(shift.date);
    dateEnd.setHours(23, 59, 59, 999);

    const existingShifts = await prisma.shiftAssignment.findMany({
      where: {
        userId: validatedData.userId,
        shift: {
          date: {
            gte: dateStart,
            lte: dateEnd,
          },
        },
      },
      include: {
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            venue: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Simple overlap check (would need more sophisticated logic for overnight shifts)
    if (existingShifts.length > 0) {
      const conflictingShift = existingShifts[0];
      errors.push({
        field: 'userId',
        message: `User is already scheduled at ${conflictingShift.shift.venue.name} on this date`,
        suggestion: 'Select a different user or change shift time',
        violationType: 'double_booking',
      });
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors,
        },
        { status: 400 }
      );
    }

    // Create the assignment
    const assignment = await prisma.shiftAssignment.create({
      data: {
        shiftId: params.id,
        userId: validatedData.userId,
        role: validatedData.role,
        isLead: validatedData.isLead,
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

    // Send notification to assigned user
    try {
      await NotificationService.create({
        userId: assignment.user.id,
        type: 'SHIFT_ASSIGNED',
        title: 'New Shift Assignment',
        message: `You have been assigned to a shift at ${shift.venue.name} on ${new Date(shift.date).toLocaleDateString()}`,
        data: {
          shiftId: shift.id,
          venueId: shift.venue.id,
          venueName: shift.venue.name,
          date: shift.date,
        },
      });
    } catch (notifError) {
      // Log but don't fail the request if notification fails
      console.error(
        'Failed to send shift assignment notification:',
        notifError
      );
    }

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating shift assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create shift assignment' },
      { status: 500 }
    );
  }
}
