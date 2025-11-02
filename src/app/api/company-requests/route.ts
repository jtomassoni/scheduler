import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { CompanyRequestStatus } from '@prisma/client';

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
 * POST /api/company-requests
 * Create a new company signup request
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
      { message: 'Request submitted successfully', id: companyRequest.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating company request:', error);
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/company-requests
 * Get all company requests (Super Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: { status?: CompanyRequestStatus } = {};
    if (
      status &&
      ['PENDING', 'REVIEWED', 'APPROVED', 'DECLINED'].includes(status)
    ) {
      where.status = status as CompanyRequestStatus;
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

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching company requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}
