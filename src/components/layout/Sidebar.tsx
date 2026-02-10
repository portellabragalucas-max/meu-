'use client';

/**
 * Sidebar Component
 * Barra lateral retratil com logo e navegacao
 */

import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItems } from './navItems';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navigateTo = (href: string) => {
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement && activeElement !== document.body) {
      activeElement.blur();
    }
    if (pathname === href || pathname.startsWith(`${href}/`)) return;
    router.push(href);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 h-screen z-50',
        'flex flex-col',
        'bg-background-light/80 backdrop-blur-glass',
        'border-r border-card-border'
      )}
      data-tutorial="sidebar"
    >
      <div className="flex h-16 items-center justify-between border-b border-card-border p-4">
        <button
          type="button"
          onClick={() => navigateTo('/dashboard')}
          className="flex items-center gap-3"
          aria-label="Ir para painel"
        >
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="absolute inset-0 h-10 w-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple opacity-50 blur-lg" />
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xl font-heading font-bold gradient-text"
              >
                Nexora
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.href)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={cn('nav-item relative w-full overflow-hidden text-left', isActive && 'active')}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl bg-neon-blue/10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}

              <Icon
                className={cn(
                  'relative z-10 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-neon-blue' : 'text-text-secondary'
                )}
              />

              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'relative z-10 font-medium',
                      isActive ? 'text-white' : 'text-text-secondary'
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {item.id === 'planner' && !isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="ml-auto"
                >
                  <span className="badge flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    IA
                  </span>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="border-t border-card-border p-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggle}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'p-3 rounded-xl',
            'bg-card-bg border border-card-border',
            'text-text-secondary hover:text-white',
            'transition-colors duration-200'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.aside>
  );
}
