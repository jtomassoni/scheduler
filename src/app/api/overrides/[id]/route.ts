import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * GET /api/overrides/[id]
 * Get a specific override by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const override = await prisma.override.findUnique({
      where: { id: params.id },
      include: {
        shift: {
          include: {
            venue: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!override) {
      return NextResponse.json(
        { error: 'Override not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(override);
  } catch (error) {
    console.error('Error fetching override:', error);
    return NextResponse.json(
      { error: 'Failed to fetch override' },
      { status: 500 }
    );
  }
}
