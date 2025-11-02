import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateRequestSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'APPROVED', 'DECLINED']),
});

/**
 * PATCH /api/companies/[id]
 * Update a company/lead status (Super Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateRequestSchema.parse(body);

    const companyRequest = await prisma.companyRequest.update({
      where: { id: params.id },
      data: {
        status: validatedData.status,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
      include: {
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Format adminNotes if it exists
    let formattedNotes = null;
    if (companyRequest.adminNotes && Array.isArray(companyRequest.adminNotes)) {
      formattedNotes = await Promise.all(
        companyRequest.adminNotes.map(async (note: any) => {
          if (note.addedById) {
            const user = await prisma.user.findUnique({
              where: { id: note.addedById },
              select: {
                name: true,
                email: true,
              },
            });
            return {
              ...note,
              addedBy: user,
            };
          }
          return note;
        })
      );
    }

    return NextResponse.json({
      ...companyRequest,
      adminNotes: formattedNotes || companyRequest.adminNotes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}
