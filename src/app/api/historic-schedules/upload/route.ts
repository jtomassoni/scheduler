import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const uploadSchema = z.object({
  data: z.string(),
  format: z.enum(['csv']),
  venueId: z.string().optional(),
  periodName: z.string().optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
});

type ShiftAssignment = {
  date: string;
  userName: string;
  role: 'BARTENDER' | 'BARBACK';
  isLead: boolean;
};

/**
 * Parse CSV schedule in the Mission Bar format
 * Format: First row has dates, subsequent rows have staff assignments
 */
function parseScheduleCSV(csvData: string): {
  assignments: ShiftAssignment[];
  errors: string[];
} {
  const lines = csvData.trim().split('\n');
  const assignments: ShiftAssignment[] = [];
  const errors: string[] = [];

  if (lines.length < 9) {
    return {
      assignments: [],
      errors: ['CSV must have at least 9 rows'],
    };
  }

  // Parse dates from first row (skip "DATE" column)
  const dateRow = lines[0].split(',');
  const dates: { index: number; date: string }[] = [];

  // Parse dates - they come in pairs with empty columns between
  for (let i = 1; i < dateRow.length; i++) {
    const dateStr = dateRow[i]?.trim();
    if (!dateStr) continue;

    // Parse date like "3-Sep" - need year context, assume current or next year
    try {
      const [day, monthAbbr] = dateStr.split('-');
      const monthMap: Record<string, string> = {
        Jan: '01',
        Feb: '02',
        Mar: '03',
        Apr: '04',
        May: '05',
        Jun: '06',
        Jul: '07',
        Aug: '08',
        Sep: '09',
        Oct: '10',
        Nov: '11',
        Dec: '12',
      };
      const month = monthMap[monthAbbr];
      if (!month) {
        errors.push(`Invalid month in date: ${dateStr}`);
        continue;
      }

      // Use 2025 for September (based on filename)
      const year = monthAbbr === 'Sep' ? '2025' : '2024';
      const date = `${year}-${month}-${day.padStart(2, '0')}`;
      dates.push({ index: i, date });
    } catch (err) {
      errors.push(`Failed to parse date: ${dateStr}`);
    }
  }

  if (dates.length === 0) {
    return {
      assignments: [],
      errors: ['No valid dates found in first row'],
    };
  }

  // Parse staff assignments
  // Row 8: BARBACK rows start here
  // Row 17: LEAD - 1 starts
  // Row 20: Numbered bartenders start

  for (let rowIdx = 8; rowIdx < lines.length; rowIdx++) {
    const line = lines[rowIdx];
    if (!line?.trim()) continue;

    const columns = line.split(',');
    const roleLabel = columns[0]?.trim().toUpperCase();

    let role: 'BARTENDER' | 'BARBACK' = 'BARTENDER';
    let isLead = false;

    // Determine role from row label
    if (roleLabel.startsWith('BARBACK')) {
      role = 'BARBACK';
    } else if (roleLabel.startsWith('LEAD')) {
      role = 'BARTENDER';
      isLead = true;
    } else if (roleLabel.match(/^\d+$/)) {
      // Numbered bartender rows
      role = 'BARTENDER';
    } else if (roleLabel === 'BAR MANAGER') {
      // Skip bar manager row for now, or could add as BARTENDER + isLead
      continue;
    } else {
      // Unknown row type, skip
      continue;
    }

    // Extract assignments for each date
    dates.forEach(({ index, date }) => {
      const nameStr = columns[index]?.trim();
      if (!nameStr) return;

      // Handle multiple names (separated by commas, dashes, or " - ")
      // Also handle cut notations like " - CUT", "(OC)", etc.
      const names = nameStr
        .split(/[,-]/)
        .map((n) => n.trim())
        .filter((n) => {
          // Filter out common suffixes
          const upper = n.toUpperCase();
          return (
            n.length > 0 &&
            !upper.includes('CUT') &&
            !upper.includes('OC') &&
            !upper.includes('MOVED TO') &&
            !upper.match(/^\(.+\)$/) // Skip parenthetical notes
          );
        });

      names.forEach((name) => {
        if (name.length > 1) {
          // Clean up name
          const cleanName = name.replace(/\(.*?\)/g, '').trim();
          if (cleanName.length > 0) {
            assignments.push({
              date,
              userName: cleanName,
              role,
              isLead,
            });
          }
        }
      });
    });
  }

  return { assignments, errors };
}

/**
 * POST /api/historic-schedules/upload
 * Upload and parse historic schedule CSV
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can upload historic schedules
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = uploadSchema.parse(body);

    // Parse the CSV
    const { assignments, errors } = parseScheduleCSV(validated.data);

    if (assignments.length === 0) {
      return NextResponse.json(
        {
          error: 'No assignments found in schedule',
          errors,
        },
        { status: 400 }
      );
    }

    // Try to match user names to existing users (by name)
    // This is a best-effort match - admin may need to adjust
    const allUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
    });

    const matchedAssignments = assignments.map((assignment) => {
      // Try to find user by name (case-insensitive, partial match)
      const user = allUsers.find((u) => {
        const userName = u.name.toLowerCase();
        const assignmentName = assignment.userName.toLowerCase();
        // Exact match or last name match
        return (
          userName === assignmentName ||
          userName.includes(assignmentName) ||
          assignmentName.includes(userName) ||
          userName.split(' ').some((part) => assignmentName.includes(part)) ||
          assignmentName.split(' ').some((part) => userName.includes(part))
        );
      });

      return {
        ...assignment,
        userId: user?.id || null,
        matched: !!user,
      };
    });

    const unmatchedCount = matchedAssignments.filter((a) => !a.matched).length;

    const body_parsed = body as { preview?: boolean };
    const isPreview = body_parsed.preview === true;

    // If preview, just return the analysis without saving
    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: true,
        totalAssignments: assignments.length,
        matchedAssignments: matchedAssignments.length - unmatchedCount,
        unmatchedAssignments: unmatchedCount,
        unmatchedNames: [
          ...new Set(
            matchedAssignments.filter((a) => !a.matched).map((a) => a.userName)
          ),
        ],
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // Store the historic schedule
    const historicSchedule = await prisma.historicSchedule.create({
      data: {
        uploadedById: session.user.id,
        venueId: validated.venueId || null,
        periodStart: new Date(validated.periodStart),
        periodEnd: new Date(validated.periodEnd),
        periodName: validated.periodName || null,
        data: matchedAssignments,
        source: 'csv',
        notes: validated.notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      scheduleId: historicSchedule.id,
      totalAssignments: assignments.length,
      matchedAssignments: matchedAssignments.length - unmatchedCount,
      unmatchedAssignments: unmatchedCount,
      unmatchedNames: [
        ...new Set(
          matchedAssignments.filter((a) => !a.matched).map((a) => a.userName)
        ),
      ],
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error uploading historic schedule:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to upload historic schedule' },
      { status: 500 }
    );
  }
}
