/**
 * API Route: POST /api/presets/[id]/import
 * Imports a preset's subjects to a user's subject list
 * 
 * Body: { userId: string }
 * 
 * Maps priority (1-5) to Subject priority (1-10): priority * 2
 * Maps difficulty (1-5) to Subject difficulty (1-10): difficulty * 2
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subjectColors } from '@/lib/utils';

// Map preset priority (1-5) to subject priority (1-10)
function mapPriority(presetPriority: number): number {
  return Math.min(10, Math.max(1, presetPriority * 2));
}

// Map preset difficulty (1-5) to subject difficulty (1-10)
function mapDifficulty(presetDifficulty: number): number {
  return Math.min(10, Math.max(1, presetDifficulty * 2));
}

// Get icon based on subject name
function getSubjectIcon(name: string): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('matemática') || nameLower.includes('matematica')) return 'calculator';
  if (nameLower.includes('português') || nameLower.includes('portugues') || nameLower.includes('linguagens')) return 'book-open';
  if (nameLower.includes('redação') || nameLower.includes('redacao')) return 'pen-tool';
  if (nameLower.includes('biologia')) return 'leaf';
  if (nameLower.includes('química') || nameLower.includes('quimica')) return 'flask';
  if (nameLower.includes('física') || nameLower.includes('fisica')) return 'atom';
  if (nameLower.includes('história') || nameLower.includes('historia')) return 'landmark';
  if (nameLower.includes('geografia')) return 'globe';
  if (nameLower.includes('filosofia')) return 'brain';
  if (nameLower.includes('sociologia')) return 'users';
  if (nameLower.includes('direito')) return 'scale';
  if (nameLower.includes('raciocínio') || nameLower.includes('lógico')) return 'brain-circuit';
  if (nameLower.includes('informática') || nameLower.includes('informatica')) return 'laptop';
  if (nameLower.includes('atualidades')) return 'newspaper';
  return 'book';
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId is required',
        },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Get preset with subjects
    const preset = await prisma.studyPreset.findUnique({
      where: { id: params.id },
      include: {
        subjects: true,
      },
    });

    if (!preset) {
      return NextResponse.json(
        {
          success: false,
          error: 'Preset not found',
        },
        { status: 404 }
      );
    }

    // Check if user already has subjects (optional: prevent duplicate imports)
    const existingSubjects = await prisma.subject.findMany({
      where: { userId },
    });

    // Import subjects from preset
    const importedSubjects = await Promise.all(
      preset.subjects.map((presetSubject, index) => {
        // Check if subject with same name already exists
        const existing = existingSubjects.find(
          (s) => s.name.toLowerCase() === presetSubject.name.toLowerCase()
        );

        if (existing) {
          // Update existing subject with preset values
          return prisma.subject.update({
            where: { id: existing.id },
            data: {
              priority: mapPriority(presetSubject.priority),
              difficulty: mapDifficulty(presetSubject.difficulty),
              targetHours: presetSubject.recommendedWeeklyHours,
            },
          });
        }

        // Create new subject
        return prisma.subject.create({
          data: {
            userId,
            name: presetSubject.name,
            color: subjectColors[index % subjectColors.length],
            icon: getSubjectIcon(presetSubject.name),
            priority: mapPriority(presetSubject.priority),
            difficulty: mapDifficulty(presetSubject.difficulty),
            targetHours: presetSubject.recommendedWeeklyHours,
            completedHours: 0,
            totalHours: 0,
            sessionsCount: 0,
            averageScore: 0,
            isActive: true,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        preset: {
          id: preset.id,
          name: preset.name,
        },
        importedCount: importedSubjects.length,
        subjects: importedSubjects,
      },
    });
  } catch (error) {
    console.error('Error importing preset:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to import preset',
      },
      { status: 500 }
    );
  }
}
