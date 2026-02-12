import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { env } from '@/lib/env';
import { sendEmail } from '@/lib/mail';
import {
  REGISTER_2FA_TTL_MS,
  buildRegister2FAIdentifier,
  generateRegister2FACode,
  hashRegister2FACode,
} from '@/lib/register-2fa';

const MIN_NAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 8;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sendRegisterCodeEmail = async ({
  name,
  email,
  code,
}: {
  name: string;
  email: string;
  code: string;
}) => {
  const firstName = name.trim().split(' ')[0] || 'Estudante';

  await sendEmail({
    to: email,
    subject: 'Codigo de verificacao - Nexora',
    text: `Oi, ${firstName}. Seu codigo de verificacao da Nexora e ${code}. Ele expira em 10 minutos.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2>Verificacao de conta</h2>
        <p>Oi, ${firstName}.</p>
        <p>Seu codigo de verificacao da Nexora e:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">${code}</p>
        <p>Este codigo expira em 10 minutos.</p>
      </div>
    `,
  });
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (name.length < MIN_NAME_LENGTH) {
      return NextResponse.json(
        { message: 'Informe um nome com pelo menos 2 caracteres.' },
        { status: 400 }
      );
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Informe um e-mail valido.' }, { status: 400 });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { message: 'A senha deve ter no minimo 8 caracteres.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'Este e-mail ja esta cadastrado.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const rawCode = generateRegister2FACode();
    const hashedCode = hashRegister2FACode(rawCode);
    const identifier = buildRegister2FAIdentifier(email);
    const expiresAt = new Date(Date.now() + REGISTER_2FA_TTL_MS);

    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });

    await prisma.verificationToken.create({
      data: {
        identifier,
        token: hashedCode,
        expires: expiresAt,
      },
    });

    let codeSent = false;

    if (env.emailServer && env.emailFrom) {
      try {
        await sendRegisterCodeEmail({
          name: user.name,
          email: user.email,
          code: rawCode,
        });
        codeSent = true;
      } catch (mailError) {
        console.error('Erro ao enviar codigo 2FA de cadastro:', mailError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        requires2FA: true,
        email,
        codeSent,
        message: codeSent
          ? 'Conta criada. Enviamos o codigo de verificacao para seu e-mail.'
          : 'Conta criada. Nao foi possivel enviar o codigo agora. Toque em reenviar codigo.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao cadastrar usuario:', error);
    return NextResponse.json(
      { message: 'Nao foi possivel concluir o cadastro agora.' },
      { status: 500 }
    );
  }
}
