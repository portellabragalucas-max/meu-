'use client';

/**
 * TopBar Component
 * Exibe estatisticas do usuario, nivel e acoes rapidas
 */

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useMemo, useRef, useEffect, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { signOut } from 'next-auth/react';
import {
  Flame,
  Bell,
  Search,
  Plus,
  User,
  LogOut,
} from 'lucide-react';
import { percentage, formatNumber } from '@/lib/utils';
import { QuickSessionModal } from '@/components/session';
import { useLocalStorage } from '@/hooks';
import type { Subject } from '@/types';
import AppContainer from './AppContainer';
import { navItems } from './navItems';

interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  createdAt: string;
  read?: boolean;
}

interface TopBarProps {
  user: {
    name: string;
    avatar?: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    streak: number;
  };
}

interface TopBarMobileProps {
  routeTitle: string;
  user: TopBarProps['user'];
  unreadCount: number;
  onToggleNotifications: () => void;
  notificationButtonRef: RefObject<HTMLButtonElement>;
}

interface TopBarDesktopProps {
  user: TopBarProps['user'];
  unreadCount: number;
  xpProgress: number;
  onOpenQuickSession: () => void;
  onToggleNotifications: () => void;
  notificationButtonRef: RefObject<HTMLButtonElement>;
}

const toTitleCase = (value: string) =>
  value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const resolveRouteTitle = (pathname: string) => {
  const matched = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (matched) return matched.label;

  const [firstSegment] = pathname.split('/').filter(Boolean);
  if (!firstSegment) return 'Nexora';
  return toTitleCase(decodeURIComponent(firstSegment));
};

function TopBarMobile({
  routeTitle,
  user,
  unreadCount,
  onToggleNotifications,
  notificationButtonRef,
}: TopBarMobileProps) {
  return (
    <AppContainer className="flex h-14 items-center justify-between gap-3 lg:hidden">
      <div className="min-w-0">
        <h1 className="truncate text-base font-heading font-semibold text-white">{routeTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          ref={notificationButtonRef}
          whileTap={{ scale: 0.94 }}
          onClick={onToggleNotifications}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-card-bg transition-colors"
          aria-label="Abrir notificacoes"
        >
          <Bell className="h-5 w-5 text-text-secondary" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-neon-cyan" />
          )}
        </motion.button>

        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-card-bg transition-colors"
          aria-label="Abrir perfil"
        >
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.name}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover border-2 border-neon-blue/50"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-neon-blue to-neon-purple">
              <User className="h-4 w-4 text-white" />
            </div>
          )}
        </Link>
      </div>
    </AppContainer>
  );
}

function TopBarDesktop({
  user,
  unreadCount,
  xpProgress,
  onOpenQuickSession,
  onToggleNotifications,
  notificationButtonRef,
}: TopBarDesktopProps) {
  return (
    <AppContainer className="hidden h-16 items-center justify-between gap-3 lg:flex">
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative w-72 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar disciplinas, sessoes..."
            className="input-field w-full py-2 pl-10 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <motion.div whileHover={{ scale: 1.05 }} className="flex cursor-pointer items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20">
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          <div className="text-sm">
            <span className="font-bold text-white">{user.streak}</span>
            <span className="ml-1 text-text-secondary">dias seguidos</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="flex cursor-pointer items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-neon-purple to-neon-blue">
              <span className="text-sm font-bold text-white">{user.level}</span>
            </div>
            <svg className="absolute inset-0 h-10 w-10 -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(127, 0, 255, 0.2)" strokeWidth="3" />
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="url(#xpGradient)"
                strokeWidth="3"
                strokeDasharray={`${xpProgress * 1.13} 113`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7F00FF" />
                  <stop offset="100%" stopColor="#00B4FF" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="text-sm">
            <div className="font-bold text-white">Nivel {user.level}</div>
            <div className="text-xs text-text-secondary">
              {formatNumber(user.xp)} / {formatNumber(user.xpToNextLevel)} XP
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenQuickSession}
          className="btn-primary flex min-h-[42px] items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Sessao Rapida</span>
        </motion.button>

        <motion.button
          ref={notificationButtonRef}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleNotifications}
          className="relative flex h-11 w-11 items-center justify-center rounded-xl hover:bg-card-bg transition-colors"
          aria-label="Abrir notificacoes"
        >
          <Bell className="h-5 w-5 text-text-secondary" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-neon-cyan" />
          )}
        </motion.button>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex max-w-full cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-card-bg"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.name}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover border-2 border-neon-blue/50"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-neon-blue to-neon-purple">
              <User className="h-4 w-4 text-white" />
            </div>
          )}
          <span className="text-sm font-medium text-white">{user.name}</span>
          <LogOut className="h-4 w-4 text-text-muted" />
        </motion.div>
      </div>
    </AppContainer>
  );
}

export default function TopBar({ user }: TopBarProps) {
  const pathname = usePathname();
  const [showQuickSession, setShowQuickSession] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useLocalStorage<NotificationItem[]>('nexora_notifications', []);
  const [subjects] = useLocalStorage<Subject[]>('nexora_subjects', []);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const desktopButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileButtonRef = useRef<HTMLButtonElement | null>(null);

  const xpProgress = percentage(user.xp, user.xpToNextLevel);
  const routeTitle = useMemo(() => resolveRouteTitle(pathname || '/dashboard'), [pathname]);
  const quickSessionSubjects = useMemo(
    () => subjects.map((subject) => ({ id: subject.id, name: subject.name, color: subject.color })),
    [subjects]
  );
  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (!showNotifications) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (desktopButtonRef.current?.contains(target)) return;
      if (mobileButtonRef.current?.contains(target)) return;
      setShowNotifications(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications]);

  useEffect(() => {
    const closeTransientUi = () => {
      setShowNotifications(false);
      setShowQuickSession(false);
    };

    window.addEventListener('nexora:mobile-nav', closeTransientUi as EventListener);
    return () => {
      window.removeEventListener('nexora:mobile-nav', closeTransientUi as EventListener);
    };
  }, []);

  useEffect(() => {
    setShowNotifications(false);
    setShowQuickSession(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-card-border bg-background-light/85 backdrop-blur-glass">
        <div className="safe-area-top">
          <TopBarMobile
            routeTitle={routeTitle}
            user={user}
            unreadCount={unreadCount}
            onToggleNotifications={() => setShowNotifications((prev) => !prev)}
            notificationButtonRef={mobileButtonRef}
          />
          <TopBarDesktop
            user={user}
            unreadCount={unreadCount}
            xpProgress={xpProgress}
            onOpenQuickSession={() => setShowQuickSession(true)}
            onToggleNotifications={() => setShowNotifications((prev) => !prev)}
            notificationButtonRef={desktopButtonRef}
          />
        </div>
      </header>

      {showNotifications && (
        <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+var(--topbar-height-mobile)+8px)] z-50 lg:top-[calc(env(safe-area-inset-top)+var(--topbar-height-desktop)+12px)]">
          <AppContainer className="flex justify-end">
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="w-full rounded-2xl border border-card-border bg-slate-900/95 p-4 shadow-2xl backdrop-blur-lg max-h-[70dvh] overflow-y-auto lg:w-[22rem] lg:max-h-[24rem]"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Notificacoes</p>
                <span className="text-xs text-text-muted">
                  {unreadCount > 0 ? `${unreadCount} novas` : 'Sem novas'}
                </span>
              </div>
              {notifications.length === 0 ? (
                <div className="text-sm text-text-muted">Nenhuma notificacao por enquanto.</div>
              ) : (
                <div className="space-y-3 pr-1">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-card-border bg-card-bg/60 p-3"
                    >
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      {item.message ? (
                        <p className="mt-1 text-xs text-text-secondary">{item.message}</p>
                      ) : null}
                      <p className="mt-2 text-[11px] text-text-muted">{item.createdAt}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AppContainer>
        </div>
      )}

      <QuickSessionModal
        isOpen={showQuickSession}
        onClose={() => setShowQuickSession(false)}
        subjects={quickSessionSubjects}
      />
    </>
  );
}
