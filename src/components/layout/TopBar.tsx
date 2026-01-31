'use client';

/**
 * TopBar Component
 * Exibe estatísticas do usuário, nível e ações rápidas
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Zap,
  Trophy,
  Bell,
  Search,
  Plus,
  User,
} from 'lucide-react';
import { percentage, formatNumber } from '@/lib/utils';
import { QuickSessionModal } from '@/components/session';
import { useLocalStorage } from '@/hooks';
import type { Subject } from '@/types';

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
  const [subjects] = useLocalStorage<Subject[]>('nexora_subjects', []);
  const xpProgress = percentage(user.xp, user.xpToNextLevel);
  const quickSessionSubjects = useMemo(
    () => subjects.map((subject) => ({ id: subject.id, name: subject.name, color: subject.color })),
    [subjects]
  );

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b border-card-border bg-background-light/50 backdrop-blur-glass">
        {/* Seção Esquerda - Busca */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar disciplinas, sessões..."
              className="input-field pl-10 w-64 py-2 text-sm"
            />
          </div>
        </div>

        {/* Seção Central - Estatísticas Rápidas */}
        <div className="flex items-center gap-6">
          {/* Sequência */}
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

          {/* Nível e XP */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="relative">
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
              <div className="font-bold text-white">Nível {user.level}</div>
              <div className="text-text-secondary text-xs">
                {formatNumber(user.xp)} / {formatNumber(user.xpToNextLevel)} XP
              </div>
            </div>
          </motion.div>
        </div>

        {/* Seção Direita - Ações e Perfil */}
        <div className="flex items-center gap-4">
          {/* Botão de Ação Rápida */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowQuickSession(true)}
            className="btn-primary py-2 px-4 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Sessão Rápida
          </motion.button>

          {/* Notificações */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative p-2 rounded-xl hover:bg-card-bg transition-colors"
          >
            <Bell className="w-5 h-5 text-text-secondary" />
            {/* Indicador de notificação */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-neon-cyan rounded-full" />
          </motion.button>

          {/* Perfil do Usuário */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-card-bg transition-colors"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
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
          </motion.div>
        </div>
      </header>

      {/* Modal de Sessão Rápida */}
      <QuickSessionModal
        isOpen={showQuickSession}
        onClose={() => setShowQuickSession(false)}
        subjects={quickSessionSubjects}
      />
    </>
  );
}

