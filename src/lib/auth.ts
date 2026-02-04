import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { prisma } from '@/lib/prisma';
import { env, hasGoogleAuth, hasEmailAuth } from '@/lib/env';

const providers = [] as NextAuthOptions['providers'];

if (hasGoogleAuth) {
  providers.push(
    GoogleProvider({
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
    })
  );
}

if (hasEmailAuth) {
  providers.push(
    EmailProvider({
      server: env.emailServer,
      from: env.emailFrom,
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
