/**
 * App Layout - Wraps all authenticated pages with main layout
 */

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { MainLayout } from '@/components/layout';
import { authOptions } from '@/lib/auth';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  return <MainLayout>{children}</MainLayout>;
}
