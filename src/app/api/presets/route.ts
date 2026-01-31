/**
 * API Route: GET /api/presets
 * Returns all available study presets with their subjects
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const presets = await prisma.studyPreset.findMany({
      include: {
        subjects: {
          orderBy: {
            priority: 'desc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: presets,
    });
  } catch (error) {
    console.error('Error fetching presets:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch presets',
      },
      { status: 500 }
    );
  }
}
