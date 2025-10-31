import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for CSV/JSON import entries
const importEntrySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format'),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format'),
  description: z.string().optional(),
});

type ImportEntry = z.infer<typeof importEntrySchema>;

/**
 * POST /api/external-blocks/import
 * Import external blocks from CSV or JSON
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { data, format } = body;

    if (!data || !format) {
      return NextResponse.json(
        { error: 'Missing required fields: data and format' },
        { status: 400 }
      );
    }

    if (format !== 'csv' && format !== 'json') {
      return NextResponse.json(
        { error: 'Format must be either "csv" or "json"' },
        { status: 400 }
      );
    }

    const entries: ImportEntry[] = [];
    const errors: string[] = [];

    // Parse based on format
    if (format === 'csv') {
      // Parse CSV data
      const lines = data.trim().split('\n');

      // Skip header row if it exists
      const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map((p: string) => p.trim());

        if (parts.length < 3) {
          errors.push(
            `Line ${i + 1}: Invalid format, expected at least 3 columns`
          );
          continue;
        }

        try {
          const entry = importEntrySchema.parse({
            date: parts[0],
            startTime: parts[1],
            endTime: parts[2],
            description: parts[3] || undefined,
          });
          entries.push(entry);
        } catch (err) {
          if (err instanceof z.ZodError) {
            errors.push(`Line ${i + 1}: ${err.errors[0].message}`);
          } else {
            errors.push(`Line ${i + 1}: Invalid data format`);
          }
        }
      }
    } else {
      // Parse JSON data
      try {
        const jsonData = typeof data === 'string' ? JSON.parse(data) : data;

        if (!Array.isArray(jsonData)) {
          return NextResponse.json(
            { error: 'JSON data must be an array of entries' },
            { status: 400 }
          );
        }

        for (let i = 0; i < jsonData.length; i++) {
          try {
            const entry = importEntrySchema.parse(jsonData[i]);
            entries.push(entry);
          } catch (err) {
            if (err instanceof z.ZodError) {
              errors.push(`Entry ${i + 1}: ${err.errors[0].message}`);
            } else {
              errors.push(`Entry ${i + 1}: Invalid data format`);
            }
          }
        }
      } catch (err) {
        return NextResponse.json(
          { error: 'Invalid JSON format' },
          { status: 400 }
        );
      }
    }

    // Return preview data if there are entries
    if (entries.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: 'No valid entries found', errors },
        { status: 400 }
      );
    }

    // Convert entries to external blocks
    const blocks = entries.map((entry) => {
      const startDateTime = new Date(`${entry.date}T${entry.startTime}`);
      const endDateTime = new Date(`${entry.date}T${entry.endTime}`);

      return {
        userId: session.user.id,
        startTime: startDateTime,
        endTime: endDateTime,
        source: 'import' as const,
        description: entry.description || null,
      };
    });

    // Validate that all end times are after start times
    const timeErrors: string[] = [];
    blocks.forEach((block, index) => {
      if (block.endTime <= block.startTime) {
        timeErrors.push(
          `Entry ${index + 1}: End time must be after start time`
        );
      }
    });

    if (timeErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors: [...errors, ...timeErrors] },
        { status: 400 }
      );
    }

    // Create all blocks in a transaction
    const createdBlocks = await prisma.$transaction(
      blocks.map((block) =>
        prisma.externalBlock.create({
          data: block,
        })
      )
    );

    return NextResponse.json({
      success: true,
      imported: createdBlocks.length,
      errors: errors.length > 0 ? errors : undefined,
      blocks: createdBlocks,
    });
  } catch (error) {
    console.error('Error importing external blocks:', error);
    return NextResponse.json(
      { error: 'Failed to import external blocks' },
      { status: 500 }
    );
  }
}
