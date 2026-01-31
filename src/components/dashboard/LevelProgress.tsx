'use client';

/**
 * LevelProgress Component
 * Exibe nível do usuário, progresso de XP e próximo marco
 */

import { motion } from 'framer-motion';
import { Trophy, Star, Zap, Target } from 'lucide-react';
import { cn, formatNumber, percentage } from '@/lib/utils';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';

interface LevelProgressProps {
  level: number;
  currentXp: number;
  xpForNextLevel: number;
  totalXp: number;
  achievements: number;
  className?: string;
}

export default function LevelProgress({
  level,
  currentXp,
  xpForNextLevel,
  totalXp,
  achievements,
  className,
}: LevelProgressProps) {
  const safeXpForNext = xpForNextLevel > 0 ? xpForNextLevel : 0;
  const progress = safeXpForNext > 0 ? percentage(currentXp, safeXpForNext) : 0;
  const xpNeeded = safeXpForNext > 0 ? safeXpForNext - currentXp : 0;

  return (
    <Card className={cn('h-full', className)} glow="purple">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-heading font-bold text-white">Seu Progresso</h2>
          <p className="text-sm text-text-secondary mt-1">Continue evoluindo!</p>
        </div>
        <motion.div
          whileHover={{ rotate: 10, scale: 1.1 }}
          className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center"
        >
          <Trophy className="w-6 h-6 text-neon-purple" />
        </motion.div>
      </div>

      {/* Emblema de Nível */}
      <div className="flex items-center gap-4 mb-6">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="relative"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center">
            <span className="text-3xl font-heading font-bold text-white">{level}</span>
          </div>
          {/* Efeito de brilho */}
          <div className="absolute inset-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue blur-xl opacity-40" />
          
          {/* Decoração de estrela */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-2 -right-2"
          >
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
          </motion.div>
        </motion.div>

        <div className="flex-1">
          <h3 className="text-lg font-heading font-bold text-white">
            Nível {level}
          </h3>
          <p className="text-sm text-text-secondary">
            {formatNumber(xpNeeded)} XP para o Nível {level + 1}
          </p>
        </div>
      </div>

      {/* Barra de Progresso XP */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-text-secondary">Experiência</span>
          <span className="text-white font-medium">
            {formatNumber(currentXp)} / {formatNumber(safeXpForNext)} XP
          </span>
        </div>
        <ProgressBar value={currentXp} max={safeXpForNext || 1} color="gradient" size="lg" />
      </div>

      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 rounded-xl bg-card-bg border border-card-border"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-neon-cyan" />
            <span className="text-xs text-text-secondary">XP Total</span>
          </div>
          <p className="text-xl font-heading font-bold text-white">
            {formatNumber(totalXp)}
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 rounded-xl bg-card-bg border border-card-border"
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-text-secondary">Conquistas</span>
          </div>
          <p className="text-xl font-heading font-bold text-white">
            {achievements}
          </p>
        </motion.div>
      </div>

      {/* Mensagem Motivacional */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 rounded-xl bg-gradient-to-r from-neon-purple/10 to-neon-blue/10 border border-neon-purple/20"
      >
        <p className="text-sm text-text-secondary">
          {progress >= 80
            ? '🔥 Quase lá! Mais algumas sessões para subir de nível!'
            : progress >= 50
            ? '💪 Ótimo progresso! Continue assim!'
            : '🚀 Cada sessão de estudo conta. Você consegue!'}
        </p>
      </motion.div>
    </Card>
  );
}

