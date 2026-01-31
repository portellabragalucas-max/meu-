import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createDefaultOnboardingSetup } from '@/services/onboarding';
import type { OnboardingAnswers } from '@/types';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const answers = body.answers as OnboardingAnswers;
    const userId: string = body.userId || 'local-demo';

    if (!answers) {
      return NextResponse.json({ error: 'Respostas não enviadas' }, { status: 400 });
    }

    const setup = createDefaultOnboardingSetup(answers);
    setup.profile.userId = userId;

    // Persist profile if Prisma client supports it (ignora se modelo não estiver gerado)
    try {
      // @ts-ignore - userProfile pode não existir se o client não foi regenerado
      if (prisma.userProfile) {
        // @ts-ignore
        await prisma.userProfile.upsert({
          where: { userId },
          update: {
            ...setup.profile,
            active_days: JSON.stringify(setup.profile.active_days),
            focus_subjects: JSON.stringify(setup.profile.focus_subjects),
          },
          create: {
            ...setup.profile,
            active_days: JSON.stringify(setup.profile.active_days),
            focus_subjects: JSON.stringify(setup.profile.focus_subjects),
          },
        });
      }
    } catch (err) {
      console.warn('Não foi possível salvar no banco (Prisma):', err);
    }

    return NextResponse.json(setup);
  } catch (error) {
    console.error('Erro no onboarding:', error);
    return NextResponse.json({ error: 'Falha ao completar onboarding' }, { status: 500 });
  }
}
