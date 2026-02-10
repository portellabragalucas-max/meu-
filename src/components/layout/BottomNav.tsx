'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type {
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { navItems } from './navItems';
import AppContainer from './AppContainer';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigate = (
    event: ReactPointerEvent<HTMLAnchorElement> | ReactMouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    const activeElement = document.activeElement as HTMLElement | null;
    if (
      'button' in event &&
      event.button !== 0
    ) {
      return;
    }
    if (
      'metaKey' in event &&
      (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    ) {
      return;
    }

    event.preventDefault();
    if (activeElement && activeElement !== document.body) {
      activeElement.blur();
    }
    if (pathname === href || pathname.startsWith(`${href}/`)) return;
    router.push(href);
  };

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-[80] lg:hidden pointer-events-auto isolate',
        'border-t border-card-border bg-background-light/92 backdrop-blur-glass'
      )}
      aria-label="Navegacao principal"
    >
      <div className="safe-area-bottom">
        <AppContainer>
          <div className="flex items-center justify-between gap-1 py-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onPointerDown={(event) => handleNavigate(event, item.href)}
                  onClick={(event) => handleNavigate(event, item.href)}
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
    </nav>
  );
}
