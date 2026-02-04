/**
 * API Route: GET /api/presets
 * Returns all available study presets with their subjects
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        data: [],
        note: 'DATABASE_URL not set',
      });
    }

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
    console.warn('Error fetching presets:', error);
    return NextResponse.json({
      success: false,
      data: [],
      error: 'Failed to fetch presets',
    });
  }
}
