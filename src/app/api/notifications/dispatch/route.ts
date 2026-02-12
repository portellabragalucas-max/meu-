import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { syncNotificationsForUser } from '@/lib/notification-center';

export const dynamic = 'force-dynamic';

const isAuthorized = (request: Request) => {
  const expectedSecret = env.notificationsCronSecret.trim();
  if (!expectedSecret) return false;

  const authorization = request.headers.get('authorization') || '';
  return authorization === `Bearer ${expectedSecret}`;
};

const handleDispatch = async (request: Request) => {
  try {
    if (!env.notificationsCronSecret.trim()) {
      return NextResponse.json(
        { success: false, error: 'NOTIFICATIONS_CRON_SECRET nao configurado.' },
        { status: 503 }
      );
    }

    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: { id: true },
    });

    let totalCreated = 0;

    for (const user of users) {
      const result = await syncNotificationsForUser(user.id);
      totalCreated += result.createdCount;
    }

    return NextResponse.json({
      success: true,
      data: {
        usersProcessed: users.length,
        notificationsCreated: totalCreated,
      },
    });
  } catch (error) {
    console.error('Erro ao despachar notificacoes em lote:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao despachar notificacoes.' },
      { status: 500 }
    );
  }
};

export async function POST(request: Request) {
  return handleDispatch(request);
}

export async function GET(request: Request) {
  return handleDispatch(request);
}
