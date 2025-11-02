import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const companyRequestSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  contactName: z.string().min(1, 'Contact name is required').max(200),
  contactEmail: z.string().email('Valid email is required').max(200),
  contactPhone: z.string().max(50).optional(),
  numberOfVenues: z.number().int().min(1, 'Must have at least 1 venue'),
  estimatedUsers: z.number().int().min(1, 'Must have at least 1 user'),
  additionalNotes: z.string().max(2000).optional(),
});

/**
 * POST /api/companies
 * Create a new company/lead
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = companyRequestSchema.parse(body);

    const companyRequest = await prisma.companyRequest.create({
      data: {
        companyName: validatedData.companyName,
        contactName: validatedData.contactName,
        contactEmail: validatedData.contactEmail,
        contactPhone: validatedData.contactPhone,
        numberOfVenues: validatedData.numberOfVenues,
        estimatedUsers: validatedData.estimatedUsers,
        additionalNotes: validatedData.additionalNotes,
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      { message: 'Company created successfully', id: companyRequest.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/companies
 * Get all companies/leads (Super Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: { status?: string } = {};
    if (
      status &&
      ['PENDING', 'REVIEWED', 'APPROVED', 'DECLINED'].includes(status)
    ) {
      where.status = status;
    }

    const requests = await prisma.companyRequest.findMany({
      where,
      include: {
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format adminNotes to include addedBy info if it's an array
    const formattedRequests = await Promise.all(
      requests.map(async (request) => {
        if (!request.adminNotes || !Array.isArray(request.adminNotes)) {
          return request;
        }

        // For each note, fetch the user who added it
        const notesWithUsers = await Promise.all(
          request.adminNotes.map(async (note: any) => {
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

        return {
          ...request,
          adminNotes: notesWithUsers,
        };
      })
    );

    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
