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
        },
      },
    },
  });

  if (!user) {
    return { createdCount: 0 };
  }

  const preferences = user.preferences;
  const dailyReminderEnabled = preferences?.dailyReminder ?? true;

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
      title: 'Lembrete de estudo',
      message: `${firstName}, quando puder, reserve alguns minutos para revisar hoje.`,
      url: '/dashboard',
      dedupeKey: `daily:${todayKey}`,
      sendPush: true,
    });

    if (dailyReminder.created) {
      createdCount += 1;
    }
  }

  return { createdCount };
};
