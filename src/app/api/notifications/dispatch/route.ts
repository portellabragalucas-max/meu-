import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { syncNotificationsForUser } from '@/lib/notification-center';

export const dynamic = 'force-dynamic';

const getAcceptedCronSecrets = () =>
  Array.from(
    new Set(
      [env.notificationsCronSecret, (process.env.CRON_SECRET ?? '').trim()]
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );

const isAuthorized = (request: Request) => {
  const acceptedSecrets = getAcceptedCronSecrets();
  if (acceptedSecrets.length === 0) return false;

  const authorization = request.headers.get('authorization') || '';
  return acceptedSecrets.some((secret) => authorization === `Bearer ${secret}`);
};

const handleDispatch = async (request: Request) => {
  try {
    const acceptedSecrets = getAcceptedCronSecrets();
    if (acceptedSecrets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configure NOTIFICATIONS_CRON_SECRET ou CRON_SECRET para habilitar o cron.',
        },
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
