'use client';

/**
 * MainLayout Component
 * Envolve as paginas com sidebar, topbar e responsividade
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const [userSettings] = useLocalStorage<UserSettings>('nexora_user_settings', defaultSettings);
  const displayName = userSettings.name || session?.user?.name || 'Estudante';

  // Gerenciar sidebar responsiva
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const applyViewportState = (mobile: boolean) => {
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    applyViewportState(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      applyViewportState(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const sidebarWidth = sidebarCollapsed ? 80 : 260;
  const contentOffset = isMobile ? 0 : sidebarWidth;
  const contentStyle = isMobile
    ? undefined
    : {
        marginLeft: contentOffset,
        width: `calc(100% - ${contentOffset}px)`,
      };

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
      <div
        style={contentStyle}
        className="relative flex min-h-screen w-full max-w-full min-w-0 flex-col overflow-x-hidden transition-[margin-left] duration-300 ease-in-out"
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
        <main className="app-main-content flex-1 min-w-0 w-full max-w-full overflow-y-visible overflow-x-hidden lg:overflow-y-auto">
          <AppContainer>
            <div key={pathname} className="w-full min-w-0 max-w-full">
              {children}
            </div>
          </AppContainer>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
