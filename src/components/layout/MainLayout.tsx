'use client';

/**
 * MainLayout Component
 * Envolve as paginas com sidebar, topbar e responsividade
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import AppContainer from './AppContainer';
import { useLocalStorage } from '@/hooks';
import { defaultSettings } from '@/lib/defaultSettings';
import type { UserSettings } from '@/types';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { data: session } = useSession();
  const [userSettings] = useLocalStorage<UserSettings>('nexora_user_settings', defaultSettings);
  const displayName = userSettings.name || session?.user?.name || 'Estudante';

  // Gerenciar sidebar responsiva
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = sidebarCollapsed ? 80 : 260;
  const contentOffset = isMobile ? 0 : sidebarWidth;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      {/* Sidebar */}
      {!isMobile && (
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}

      {/* Area de conteudo principal */}
      <motion.div
        initial={false}
        animate={{ marginLeft: contentOffset }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="relative flex min-h-screen w-full max-w-full min-w-0 flex-col overflow-x-hidden"
      >
        {/* Barra superior */}
        <TopBar
          user={{
            name: displayName,
            avatar: userSettings.avatar ?? session?.user?.image ?? undefined,
            level: 0,
            xp: 0,
            xpToNextLevel: 0,
            streak: 0,
          }}
        />

        {/* Conteudo da pagina */}
        <main className="app-main-content flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden">
          <AppContainer>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="w-full min-w-0 max-w-full"
            >
              {children}
            </motion.div>
          </AppContainer>
        </main>
      </motion.div>

      <BottomNav />
    </div>
  );
}
