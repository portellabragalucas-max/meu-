'use client';

/**
 * Sidebar Component
 * Barra lateral retratil com logo e navegacao
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
      <div className="flex items-center justify-between p-4 h-16 border-b border-card-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute inset-0 w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple blur-lg opacity-50" />
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
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'nav-item group relative overflow-hidden transition-transform duration-200',
                'hover:translate-x-1',
                isActive && 'active'
              )}
            >
              {isActive && (
                <span className="pointer-events-none absolute inset-0 bg-neon-blue/10 rounded-xl" />
              )}

              <Icon
                className={cn(
                  'w-5 h-5 relative z-10 flex-shrink-0',
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
                    <Zap className="w-3 h-3" />
                    IA
                  </span>
                </motion.div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-card-border">
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
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.aside>
  );
}
