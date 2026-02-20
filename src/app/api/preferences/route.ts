import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import type { UserSettings } from '@/types';

const prismaAny = prisma as any;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
      if (prismaAny.userPreferences) {
        const prefs = await prismaAny.userPreferences.findUnique({
          where: { userId },
        });
        return NextResponse.json({ success: true, data: prefs });
      }
    } catch (error) {
      console.warn('Preferences API: falha ao carregar do banco.', error);
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Falha ao carregar preferencias.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings = body.settings as UserSettings;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!settings) {
      return NextResponse.json({ success: false, error: 'Configuracoes ausentes.' }, { status: 400 });
    }

    try {
      if (settings.name) {
        await prisma.user.update({
          where: { id: userId },
          data: { name: settings.name },
        });
      }
    } catch (error) {
      console.warn('Preferences API: falha ao atualizar perfil do usuario.', error);
    }

    try {
      if (prismaAny.userPreferences) {
        await prismaAny.userPreferences.upsert({
          where: { userId },
          update: {
            dailyGoalHours: settings.dailyGoalHours,
            preferredStart: settings.preferredStart,
            preferredEnd: settings.preferredEnd,
            maxBlockMinutes: settings.maxBlockMinutes,
            breakMinutes: settings.breakMinutes,
            alarmSound: settings.alarmSound ?? 'pulse',
            dailyReminder: settings.dailyReminder ?? true,
            streakReminder: settings.streakReminder ?? true,
            achievementAlerts: settings.achievementAlerts ?? true,
            weeklyReport: settings.weeklyReport ?? true,
            dailyHoursByWeekday: settings.dailyHoursByWeekday ?? null,
            restDays: JSON.stringify(settings.excludeDays ?? []),
            examDate: settings.examDate || null,
          },
          create: {
            userId,
            dailyGoalHours: settings.dailyGoalHours,
            preferredStart: settings.preferredStart,
            preferredEnd: settings.preferredEnd,
            maxBlockMinutes: settings.maxBlockMinutes,
            breakMinutes: settings.breakMinutes,
            alarmSound: settings.alarmSound ?? 'pulse',
            dailyReminder: settings.dailyReminder ?? true,
            streakReminder: settings.streakReminder ?? true,
            achievementAlerts: settings.achievementAlerts ?? true,
            weeklyReport: settings.weeklyReport ?? true,
            dailyHoursByWeekday: settings.dailyHoursByWeekday ?? null,
            restDays: JSON.stringify(settings.excludeDays ?? []),
            examDate: settings.examDate || null,
          },
        });
      }
    } catch (error) {
      console.warn('Preferences API: banco indisponivel, usando fallback local.', error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar preferencias:', error);
    return NextResponse.json({ success: false, error: 'Falha ao salvar preferencias.' }, { status: 500 });
  }
}


