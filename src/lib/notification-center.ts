import { prisma } from '@/lib/prisma';
import { hasWebPush } from '@/lib/env';
import { sendWebPushNotification } from '@/lib/web-push';
import type { Prisma } from '@prisma/client';

export type NotificationType = 'daily' | 'streak' | 'weekly' | 'achievement' | 'system';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  url?: string;
  dedupeKey?: string;
  metadata?: Prisma.JsonObject;
  sendPush?: boolean;
}

interface WebPushError extends Error {
  statusCode?: number;
}

const toUtcDayStart = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const toDayKey = (date: Date) => {
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
};

const toIsoWeekKey = (date: Date) => {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

const formatHoursFromMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours === 0) return `${remainingMinutes}min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h${String(remainingMinutes).padStart(2, '0')}`;
};

const pushToUser = async ({
  userId,
  title,
  body,
  url,
  tag,
}: {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag: string;
}) => {
  if (!hasWebPush) return 0;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: {
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  if (subscriptions.length === 0) return 0;

  let deliveredCount = 0;

  for (const subscription of subscriptions) {
    try {
      await sendWebPushNotification({
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload: {
          title,
          body,
          url: url || '/dashboard',
          tag,
        },
      });
      deliveredCount += 1;
    } catch (error) {
      const typedError = error as WebPushError;
      if (typedError.statusCode === 404 || typedError.statusCode === 410) {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: subscription.endpoint },
        });
      } else {
        console.error('Erro ao enviar push:', error);
      }
    }
  }

  return deliveredCount;
};

export const createNotificationForUser = async ({
  userId,
  type,
  title,
  message,
  url,
  dedupeKey,
  metadata,
  sendPush = false,
}: CreateNotificationInput) => {
  if (dedupeKey) {
    const existing = await prisma.userNotification.findUnique({
      where: {
        userId_dedupeKey: {
          userId,
          dedupeKey,
        },
      },
    });

    if (existing) {
      return { notification: existing, created: false, pushDelivered: 0 };
    }
  }

  const notification = await prisma.userNotification.create({
    data: {
      userId,
      type,
      title,
      message,
      url,
      dedupeKey,
      metadata,
    },
  });

  let pushDelivered = 0;

  if (sendPush) {
    pushDelivered = await pushToUser({
      userId,
      title,
      body: message || title,
      url,
      tag: dedupeKey || `notification:${notification.id}`,
    });

    if (pushDelivered > 0) {
      await prisma.userNotification.update({
        where: { id: notification.id },
        data: { pushedAt: new Date() },
      });
    }
  }

  return { notification, created: true, pushDelivered };
};

export const listNotificationsForUser = async (userId: string, take = 25) => {
  const notifications = await prisma.userNotification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  });

  return notifications.map((item) => ({
    id: item.id,
    type: item.type as NotificationType,
    title: item.title,
    message: item.message || undefined,
    url: item.url || undefined,
    createdAt: item.createdAt.toISOString(),
    read: Boolean(item.readAt),
  }));
};

export const markNotificationAsRead = async ({
  userId,
  notificationId,
}: {
  userId: string;
  notificationId: string;
}) => {
  await prisma.userNotification.updateMany({
    where: {
      id: notificationId,
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
};

export const markAllNotificationsAsRead = async (userId: string) => {
  await prisma.userNotification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
};

export const syncNotificationsForUser = async (userId: string) => {
  const now = new Date();
  const todayStart = toUtcDayStart(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
  const todayKey = toDayKey(now);
  const weekKey = toIsoWeekKey(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      streak: true,
      lastStudyDate: true,
      preferences: {
        select: {
          dailyReminder: true,
          streakReminder: true,
          weeklyReport: true,
          achievementAlerts: true,
        },
      },
    },
  });

  if (!user) {
    return { createdCount: 0 };
  }

  const preferences = user.preferences;
  const dailyReminderEnabled = preferences?.dailyReminder ?? true;
  const streakReminderEnabled = preferences?.streakReminder ?? true;
  const weeklyReportEnabled = preferences?.weeklyReport ?? true;
  const achievementAlertsEnabled = preferences?.achievementAlerts ?? true;

  const fullName = user.name?.trim() || 'Estudante';
  const firstName = fullName.split(' ')[0] || fullName;

  let createdCount = 0;

  const sessionsToday = await prisma.studySession.count({
    where: {
      userId,
      startedAt: {
        gte: todayStart,
        lt: tomorrowStart,
      },
    },
  });
  const hasStudiedToday = sessionsToday > 0;

  if (dailyReminderEnabled && !hasStudiedToday) {
    const dailyReminder = await createNotificationForUser({
      userId,
      type: 'daily',
      title: 'Hora de estudar',
      message: `${firstName}, seu plano de hoje ja esta pronto para comecar.`,
      url: '/dashboard',
      dedupeKey: `daily:${todayKey}`,
      sendPush: true,
    });

    if (dailyReminder.created) {
      createdCount += 1;
    }
  }

  if (streakReminderEnabled && user.streak > 0 && !hasStudiedToday) {
    const streakReminder = await createNotificationForUser({
      userId,
      type: 'streak',
      title: 'Mantenha sua sequencia',
      message: `Voce esta com ${user.streak} dias seguidos. Faca uma sessao hoje para nao perder.`,
      url: '/dashboard',
      dedupeKey: `streak:${todayKey}`,
      sendPush: true,
    });

    if (streakReminder.created) {
      createdCount += 1;
    }
  }

  if (weeklyReportEnabled && now.getUTCDay() === 1) {
    const previousWeekStart = new Date(todayStart);
    previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7);

    const weeklyStats = await prisma.studySession.aggregate({
      where: {
        userId,
        startedAt: {
          gte: previousWeekStart,
          lt: todayStart,
        },
      },
      _sum: {
        actualMinutes: true,
      },
      _count: {
        _all: true,
      },
    });

    const totalMinutes = weeklyStats._sum.actualMinutes ?? 0;
    const totalSessions = weeklyStats._count._all;

    const weeklyReport = await createNotificationForUser({
      userId,
      type: 'weekly',
      title: 'Resumo semanal',
      message: `Semana passada: ${formatHoursFromMinutes(totalMinutes)} em ${totalSessions} sessoes.`,
      url: '/analytics',
      dedupeKey: `weekly:${weekKey}`,
      sendPush: true,
      metadata: {
        totalMinutes,
        totalSessions,
      },
    });

    if (weeklyReport.created) {
      createdCount += 1;
    }
  }

  if (achievementAlertsEnabled) {
    const achievementWindowStart = new Date(now.getTime() - 1000 * 60 * 60 * 24);
    const recentAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        unlockedAt: {
          gte: achievementWindowStart,
        },
      },
      include: {
        achievement: {
          select: {
            id: true,
            name: true,
            rarity: true,
          },
        },
      },
      orderBy: {
        unlockedAt: 'desc',
      },
      take: 3,
    });

    for (const unlockedAchievement of recentAchievements) {
      const result = await createNotificationForUser({
        userId,
        type: 'achievement',
        title: 'Nova conquista desbloqueada',
        message: `${unlockedAchievement.achievement.name} (${unlockedAchievement.achievement.rarity})`,
        url: '/dashboard',
        dedupeKey: `achievement:${unlockedAchievement.achievement.id}`,
        sendPush: true,
      });

      if (result.created) {
        createdCount += 1;
      }
    }
  }

  return { createdCount };
};
