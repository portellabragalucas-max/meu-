'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { navItems } from './navItems';

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[9999] md:hidden pointer-events-auto isolate',
        'bg-background-light/90 backdrop-blur-glass',
        'border-t border-card-border'
      )}
      aria-label="Navegacao principal"
    >
      <div className="mx-auto w-full max-w-[640px] px-4">
        <div className="flex items-center justify-between py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <a
                key={item.id}
                href={item.href}
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
              </a>
            );
          })}
        </div>
        <div className="safe-area-bottom h-2" />
      </div>
    </nav>
  );
}
