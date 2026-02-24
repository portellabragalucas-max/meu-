/**
 * API Route: GET /api/presets
 * Returns all available study presets with their subjects
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEnemPresetSubjects } from '@/lib/enemCatalog';

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

    const normalizedPresets = presets.map((preset) => {
      if (preset.name.toLowerCase() !== 'enem') return preset;
      return {
        ...preset,
        subjects: getEnemPresetSubjects().map((subject, index) => ({
          id: `enem-${index + 1}`,
          presetId: preset.id,
          name: subject.name,
          priority: subject.priority,
          difficulty: subject.difficulty,
          recommendedWeeklyHours: subject.recommendedWeeklyHours,
          createdAt: preset.createdAt,
          updatedAt: preset.updatedAt,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: normalizedPresets,
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
