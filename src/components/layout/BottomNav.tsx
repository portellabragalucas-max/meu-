'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { MouseEvent, TouchEvent, PointerEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { navItems } from './navItems';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigate = (href: string) => (
    event: MouseEvent | TouchEvent | PointerEvent
  ) => {
    event.preventDefault();
    if (pathname === href || pathname.startsWith(`${href}/`)) return;
    router.push(href);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        if (window.location.pathname !== href) {
          window.location.assign(href);
        }
      }, 120);
    }
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[9999] md:hidden pointer-events-auto isolate',
        'bg-background-light/90 backdrop-blur-glass',
        'border-t border-card-border'
      )}
      aria-label="Navegacao principal"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={handleNavigate(item.href)}
              onTouchEnd={handleNavigate(item.href)}
              onPointerUp={handleNavigate(item.href)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl',
                'min-w-[56px] min-h-[52px] text-[11px]',
                'touch-manipulation',
                isActive ? 'text-neon-blue' : 'text-text-secondary'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-xl bg-neon-blue/10 pointer-events-none"
                />
              )}
              <Icon className="w-5 h-5 relative z-10" />
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="safe-area-bottom h-2" />
    </nav>
  );
}
