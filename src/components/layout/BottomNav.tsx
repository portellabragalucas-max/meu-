'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { navItems } from './navItems';
import AppContainer from './AppContainer';

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeHref = useMemo(() => {
    const matched = navItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    return matched?.href ?? '';
  }, [pathname]);

  if (!mounted) return null;

  return createPortal(
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-[2147483647] lg:hidden pointer-events-auto',
        'border-t border-card-border bg-background-light/92 backdrop-blur-glass'
      )}
      aria-label="Navegacao principal"
    >
      <div className="safe-area-bottom">
        <AppContainer>
          <div className="flex items-center justify-between gap-1 py-1.5">
            {navItems.map((item) => {
              const isActive = activeHref === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2',
                    'min-h-[50px] touch-manipulation text-[10px] sm:text-[11px]',
                    isActive ? 'text-neon-blue' : 'text-text-secondary'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-active"
                      className="pointer-events-none absolute inset-0 rounded-xl bg-neon-blue/10"
                    />
                  )}
                  <Icon className="relative z-10 h-5 w-5" />
                  <span className="relative z-10 max-w-full truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </AppContainer>
      </div>
    </nav>,
    document.body
  );
}
