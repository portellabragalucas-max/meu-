'use client';

/**
 * MainLayout Component
 * Envolve as páginas com sidebar, topbar e responsividade
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
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
      const mobile = window.innerWidth < 768;
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
    <div className="min-h-screen bg-background w-full max-w-full overflow-x-clip">
      {/* Sidebar */}
      {!isMobile && (
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}

      {/* Área de Conteúdo Principal */}
      <motion.div
        initial={false}
        animate={{ marginLeft: contentOffset }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-screen flex flex-col relative w-full max-w-full overflow-x-clip"
      >
        {/* Barra Superior */}
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

        {/* Conteúdo da Página */}
        <main className="flex-1 overflow-y-auto mobile-container min-w-0 w-full max-w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full min-w-0 max-w-full sm:max-w-[680px] sm:mx-auto lg:max-w-none"
          >
            {children}
          </motion.div>
        </main>
      </motion.div>

      {/* Overlay mobile quando sidebar está aberta */}
      {isMobile && !sidebarCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarCollapsed(true)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      <BottomNav />

    </div>
  );
}
