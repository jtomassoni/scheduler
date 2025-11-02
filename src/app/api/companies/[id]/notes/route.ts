import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const addNoteSchema = z.object({
  text: z.string().min(1, 'Note text is required').max(2000),
});

/**
 * POST /api/companies/[id]/notes
 * Add a note to a company/lead (Super Admin only)
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

    if (!isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle both Promise and direct params (Next.js 13+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const companyId = resolvedParams.id;

    const body = await request.json();
    const validatedData = addNoteSchema.parse(body);

    // Get existing company request
    const companyRequest = await prisma.companyRequest.findUnique({
      where: { id: companyId },
      select: { adminNotes: true },
    });

    if (!companyRequest) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Parse existing notes or start with empty array
    const existingNotes = Array.isArray(companyRequest.adminNotes)
      ? companyRequest.adminNotes
      : companyRequest.adminNotes
        ? [companyRequest.adminNotes]
        : [];

    // Add new note
    const newNote = {
      text: validatedData.text,
      timestamp: new Date().toISOString(),
      addedById: session.user.id,
    };

    const updatedNotes = [...existingNotes, newNote];

    // Update company request with new notes array
    const updated = await prisma.companyRequest.update({
      where: { id: companyId },
      data: {
        adminNotes: updatedNotes as any,
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

    // Fetch addedBy user info for all notes
    const userIds = [
      ...new Set(
        updatedNotes.map((note: any) => note.addedById).filter(Boolean)
      ),
    ];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const userMap = new Map(
      users.map((u) => [u.id, { name: u.name, email: u.email }])
    );

    // Format notes with addedBy info
    const formattedNotes = updatedNotes.map((note: any) => ({
      ...note,
      addedBy: note.addedById ? userMap.get(note.addedById) || null : null,
    }));

    return NextResponse.json({
      ...updated,
      adminNotes: formattedNotes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error adding note:', error);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}
