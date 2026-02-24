/**
 * API Route: POST /api/presets/[id]/import
 * Imports a preset's subjects to a user's subject list
 *
 * Uses session user, maps preset scale (1-5) to subject scale (1-10)
 * and deduplicates by canonical subject name.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { subjectColors } from '@/lib/utils';
import { getEnemPresetSubjects } from '@/lib/enemCatalog';
import {
  dedupePresetSubjectsByCanonical,
  getCanonicalSubjectName,
  getCuratedPresetByName,
} from '@/lib/presetCatalog';
import { buildConcursosPresetSubjectsFromAnswers } from '@/services/concursosPresetIntelligence';
import type { PresetWizardAnswers } from '@/types';

type ImportPresetSubject = {
  name: string;
  priority: number;
  difficulty: number;
  recommendedWeeklyHours: number;
};

function mapPriority(presetPriority: number): number {
  return Math.min(10, Math.max(1, presetPriority * 2));
}

function mapDifficulty(presetDifficulty: number): number {
  return Math.min(10, Math.max(1, presetDifficulty * 2));
}

function getSubjectIcon(name: string): string {
  const canonical = getCanonicalSubjectName(name);

  if (canonical.includes('matematica')) return 'calculator';
  if (canonical.includes('lingua portuguesa') || canonical.includes('interpretacao') || canonical.includes('literatura')) {
    return 'book-open';
  }
  if (canonical.includes('lingua estrangeira')) return 'languages';
  if (canonical.includes('redacao')) return 'pen-tool';
  if (canonical.includes('biologia')) return 'leaf';
  if (canonical.includes('quimica')) return 'flask';
  if (canonical.includes('fisica')) return 'atom';
  if (canonical.includes('historia')) return 'landmark';
  if (canonical.includes('geografia')) return 'globe';
  if (canonical.includes('filosofia')) return 'brain';
  if (canonical.includes('sociologia')) return 'users';
  if (canonical.includes('direito')) return 'scale';
  if (canonical.includes('raciocinio logico')) return 'brain-circuit';
  if (canonical.includes('informatica')) return 'laptop';
  if (canonical.includes('atualidades')) return 'newspaper';
  if (canonical.includes('administracao')) return 'briefcase';
  if (canonical === 'legislacao') return 'scroll-text';
  if (canonical.includes('contabilidade')) return 'calculator';
  if (canonical.includes('auditoria')) return 'clipboard-list';
  if (canonical.includes('controle')) return 'shield-check';

  return 'book';
}

function toImportSubjects(
  dbPresetSubjects: ImportPresetSubject[],
  dbPresetName: string,
  wizardAnswers?: PresetWizardAnswers
): ImportPresetSubject[] {
  if (dbPresetName.toLowerCase() === 'enem') {
    return dedupePresetSubjectsByCanonical(getEnemPresetSubjects()).map((subject) => ({
      name: subject.name,
      priority: subject.priority,
      difficulty: subject.difficulty,
      recommendedWeeklyHours: subject.recommendedWeeklyHours,
    }));
  }

  if (dbPresetName.toLowerCase().includes('concurso')) {
    return buildConcursosPresetSubjectsFromAnswers(wizardAnswers);
  }

  const curated = getCuratedPresetByName(dbPresetName);
  if (curated) {
    return dedupePresetSubjectsByCanonical(curated.subjects).map((subject) => ({
      name: subject.name,
      priority: subject.priority,
      difficulty: subject.difficulty,
      recommendedWeeklyHours: subject.recommendedWeeklyHours,
    }));
  }

  return dedupePresetSubjectsByCanonical(dbPresetSubjects).map((subject) => ({
    name: subject.name,
    priority: subject.priority,
    difficulty: subject.difficulty,
    recommendedWeeklyHours: subject.recommendedWeeklyHours,
  }));
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    let body: { wizardAnswers?: PresetWizardAnswers } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const preset = await prisma.studyPreset.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        subjects: true,
      },
    });

    if (!preset) {
      return NextResponse.json({ success: false, error: 'Preset not found' }, { status: 404 });
    }

    const presetSubjects = toImportSubjects(preset.subjects, preset.name, body.wizardAnswers);

    const existingSubjects = await prisma.subject.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    const existingSubjectsByCanonical = new Map(
      existingSubjects.map((subject) => [getCanonicalSubjectName(subject.name), subject])
    );

    const importedSubjects = await Promise.all(
      presetSubjects.map((presetSubject, index) => {
        const canonicalName = getCanonicalSubjectName(presetSubject.name);
        const existing = existingSubjectsByCanonical.get(canonicalName);

        if (existing) {
          return prisma.subject.update({
            where: { id: existing.id },
            data: {
              name: presetSubject.name,
              priority: mapPriority(presetSubject.priority),
              difficulty: mapDifficulty(presetSubject.difficulty),
              targetHours: presetSubject.recommendedWeeklyHours,
            },
          });
        }

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
        preset: { id: preset.id, name: preset.name },
        importedCount: importedSubjects.length,
        subjects: importedSubjects,
      },
    });
  } catch (error) {
    console.error('Error importing preset:', error);
    return NextResponse.json({ success: false, error: 'Failed to import preset' }, { status: 500 });
  }
}
