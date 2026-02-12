import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasWebPush } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { sendWebPushNotification } from '@/lib/web-push';

const prismaAny = prisma as any;

interface WebPushError extends Error {
  statusCode?: number;
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasWebPush) {
      return NextResponse.json(
        { success: false, error: 'Push indisponivel no momento.' },
        { status: 503 }
      );
    }

    if (!prismaAny.pushSubscription) {
      return NextResponse.json(
        { success: false, error: 'Persistencia de notificacoes indisponivel.' },
        { status: 503 }
      );
    }

    const latestSubscription = await prismaAny.pushSubscription.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        endpoint: true,
        p256dh: true,
        auth: true,
      },
    });

    if (!latestSubscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nenhum dispositivo cadastrado. Ative as notificacoes neste navegador.',
        },
        { status: 400 }
      );
    }

    try {
      await sendWebPushNotification({
        subscription: {
          endpoint: latestSubscription.endpoint,
          keys: {
            p256dh: latestSubscription.p256dh,
            auth: latestSubscription.auth,
          },
        },
        payload: {
          title: 'Nexora',
          body: 'Notificacoes push ativadas com sucesso.',
          url: '/dashboard',
          tag: 'nexora-push-test',
        },
      });
    } catch (error) {
      const typedError = error as WebPushError;
      if (typedError.statusCode === 404 || typedError.statusCode === 410) {
        await prismaAny.pushSubscription.deleteMany({
          where: { endpoint: latestSubscription.endpoint },
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Assinatura expirada. Ative as notificacoes novamente.',
          },
          { status: 410 }
        );
      }

      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Notificacao de teste enviada.',
    });
  } catch (error) {
    console.error('Erro ao enviar notificacao de teste:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao enviar notificacao de teste.' },
      { status: 500 }
    );
  }
}
