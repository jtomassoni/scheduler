import { prisma } from './prisma';

/**
 * Auto-submit availability defaults for users who have auto-submit enabled
 * and haven't submitted yet, when deadline has passed
 *
 * This should be called by a cron job daily or manually triggered
 */
export async function autoSubmitAvailabilityDefaults(month: string) {
  try {
    // Get all venues with their deadline settings
    const venues = await prisma.venue.findMany({
      select: {
        id: true,
        name: true,
        availabilityDeadlineDay: true,
      },
    });

    const [year, monthNum] = month.split('-').map(Number);
    const results = [];

    for (const venue of venues) {
      const deadlineDate = new Date(
        year,
        monthNum - 1,
        venue.availabilityDeadlineDay
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      deadlineDate.setHours(0, 0, 0, 0);

      // Check if deadline has passed
      if (today > deadlineDate) {
        // Find users with auto-submit enabled who haven't submitted for this month
        const users = await prisma.user.findMany({
          where: {
            autoSubmitAvailability: true,
            availabilities: {
              none: {
                month,
                submittedAt: {
                  not: null,
                },
              },
            },
          },
          select: {
            id: true,
            email: true,
            name: true,
            defaultAvailability: true,
          },
        });

        for (const user of users) {
          // Check if user has default availability set
          if (user.defaultAvailability) {
            // Get or create availability record
            const availability = await prisma.availability.upsert({
              where: {
                userId_month: {
                  userId: user.id,
                  month,
                },
              },
              create: {
                userId: user.id,
                month,
                data: user.defaultAvailability as any,
                submittedAt: new Date(),
                isLocked: true,
                lockedAt: new Date(),
              },
              update: {
                data: user.defaultAvailability as any,
                submittedAt: new Date(),
                isLocked: true,
                lockedAt: new Date(),
              },
            });

            results.push({
              userId: user.id,
              userName: user.name,
              venueId: venue.id,
              venueName: venue.name,
              autoSubmitted: true,
            });
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error auto-submitting availability:', error);
    throw error;
  }
}

/**
 * Send reminder notifications for availability deadlines
 * Should be called by cron job at T-7, T-3, T-1 days before deadline
 */
export async function sendAvailabilityReminders(daysBeforeDeadline: number) {
  try {
    // Calculate target month (next month)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const month = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

    const [year, monthNum] = month.split('-').map(Number);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const venues = await prisma.venue.findMany({
      select: {
        id: true,
        name: true,
        availabilityDeadlineDay: true,
      },
    });

    const reminders = [];

    for (const venue of venues) {
      const deadlineDate = new Date(
        year,
        monthNum - 1,
        venue.availabilityDeadlineDay
      );
      deadlineDate.setHours(0, 0, 0, 0);

      const daysUntilDeadline = Math.ceil(
        (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDeadline === daysBeforeDeadline) {
        // Find users who haven't submitted for this venue/month
        // TODO: This is simplified - in reality, you'd need to check if user is assigned to venue
        const users = await prisma.user.findMany({
          where: {
            role: {
              in: ['BARTENDER', 'BARBACK'],
            },
            availabilities: {
              none: {
                month,
                submittedAt: {
                  not: null,
                },
              },
            },
          },
          select: {
            id: true,
            email: true,
            name: true,
          },
        });

        reminders.push({
          venueId: venue.id,
          venueName: venue.name,
          deadlineDate,
          daysUntilDeadline,
          users: users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
          })),
        });
      }
    }

    return reminders;
  } catch (error) {
    console.error('Error sending availability reminders:', error);
    throw error;
  }
}
