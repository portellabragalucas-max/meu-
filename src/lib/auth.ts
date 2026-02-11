import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { env, hasGoogleAuth } from '@/lib/env';

const providers = [] as NextAuthOptions['providers'];

providers.push(
  CredentialsProvider({
    name: 'Email e senha',
    credentials: {
      email: { label: 'E-mail', type: 'email' },
      password: { label: 'Senha', type: 'password' },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password ?? '';

      if (!email || !password) return null;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user?.passwordHash) return null;

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image || user.avatar || null,
      };
    },
  })
);

if (hasGoogleAuth) {
  providers.push(
    GoogleProvider({
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database',
  },
  providers,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        session.user.name = user.name;
        session.user.email = user.email;
        session.user.image = user.image || undefined;
      }
      return session;
    },
  },
};
