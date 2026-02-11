import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

const MIN_NAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 8;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Erro ao cadastrar usuario:', error);
    return NextResponse.json(
      { message: 'Nao foi possivel concluir o cadastro agora.' },
      { status: 500 }
    );
  }
}
