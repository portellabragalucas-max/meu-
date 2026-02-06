'use client';

/**
 * TopBar Component
 * Exibe estatÃ­sticas do usuÃ¡rio, nÃ­vel e aÃ§Ãµes rÃ¡pidas
 */

import Image from 'next/image';
import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { signOut } from 'next-auth/react';
import {
  Flame,
  Zap,
  Trophy,
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

export default function TopBar({ user }: TopBarProps) {
  const [showQuickSession, setShowQuickSession] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useLocalStorage<NotificationItem[]>(
    'nexora_notifications',
    []
  );
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [subjects] = useLocalStorage<Subject[]>('nexora_subjects', []);
  const xpProgress = percentage(user.xp, user.xpToNextLevel);
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
      if (buttonRef.current?.contains(target)) return;
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

  return (
    <>
      <header className="h-16 border-b border-card-border bg-background-light/50 backdrop-blur-glass safe-area-top">
        <div className="mx-auto w-full max-w-[640px] lg:max-w-none px-4 md:px-6 h-full flex items-center justify-between">
          {/* SeÃ§Ã£o Esquerda - Busca */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar disciplinas, sessÃµes..."
                className="input-field pl-10 w-64 py-2 text-sm"
              />
            </div>
          </div>

          {/* SeÃ§Ã£o Central - EstatÃ­sticas RÃ¡pidas */}
          <div className="hidden lg:flex items-center gap-6">
            {/* SequÃªncia */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-sm">
                <span className="font-bold text-white">{user.streak}</span>
                <span className="text-text-secondary ml-1">dias seguidos</span>
              </div>
            </motion.div>

            {/* NÃ­vel e XP */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="relative hidden md:block">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{user.level}</span>
                </div>
                {/* Anel de Progresso XP */}
                <svg
                  className="absolute inset-0 w-10 h-10 -rotate-90"
                  viewBox="0 0 40 40"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke="rgba(127, 0, 255, 0.2)"
                    strokeWidth="3"
                  />
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
                <div className="font-bold text-white">NÃ­vel {user.level}</div>
                <div className="text-text-secondary text-xs">
                  {formatNumber(user.xp)} / {formatNumber(user.xpToNextLevel)} XP
                </div>
              </div>
            </motion.div>
          </div>

          {/* SeÃ§Ã£o Direita - AÃ§Ãµes e Perfil */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* BotÃ£o de AÃ§Ã£o RÃ¡pida */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowQuickSession(true)}
              className="btn-primary py-2 px-3 md:px-4 flex items-center gap-2 text-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">SessÃ£o RÃ¡pida</span>
            </motion.button>

            {/* Notificacoes */}
            <div className="relative">
              <motion.button
                ref={buttonRef}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative w-11 h-11 flex items-center justify-center rounded-xl hover:bg-card-bg transition-colors"
              >
                <Bell className="w-5 h-5 text-text-secondary" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-neon-cyan rounded-full" />
                )}
              </motion.button>
              {showNotifications && (
                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute mt-3 w-[min(92vw,20rem)] rounded-2xl border border-card-border bg-slate-900/95 shadow-2xl backdrop-blur-lg p-4 z-50 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-0"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-white">Notificacoes</p>
                    <span className="text-xs text-text-muted">
                      {unreadCount > 0 ? `${unreadCount} novas` : 'Sem novas'}
                    </span>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="text-sm text-text-muted">Nenhuma notificacao por enquanto.</div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {notifications.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-card-border bg-card-bg/60 p-3"
                        >
                          <p className="text-sm font-medium text-white">{item.title}</p>
                          {item.message ? (
                            <p className="text-xs text-text-secondary mt-1">{item.message}</p>
                          ) : null}
                          <p className="text-[11px] text-text-muted mt-2">{item.createdAt}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
            {/* Perfil do UsuÃ¡rio */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-card-bg transition-colors min-h-[44px]"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border-2 border-neon-blue/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="text-sm font-medium text-white hidden lg:block">
                {user.name}
              </span>
              <LogOut className="w-4 h-4 text-text-muted hidden lg:block" />
            </motion.div>
          </div>
        </div>
      </header>

      {/* Modal de SessÃ£o RÃ¡pida */}
      <QuickSessionModal
        isOpen={showQuickSession}
        onClose={() => setShowQuickSession(false)}
        subjects={quickSessionSubjects}
      />
    </>
  );
}

