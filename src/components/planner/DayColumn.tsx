'use client';

/**
 * DayColumn Component
 * Representa um único dia no planner semanal
 */

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn, isSameDay } from '@/lib/utils';
import TimeBlock from './TimeBlock';
import type { StudyBlock } from '@/types';

interface DayColumnProps {
  date: Date;
  blocks: StudyBlock[];
  dailyLimitMinutes?: number;
  onAdjustDailyLimit?: (date: Date, deltaMinutes: number) => void;
  onAddBlock: (date: Date) => void;
  onEditBlock: (block: StudyBlock) => void;
  onDeleteBlock: (blockId: string) => void;
  onStartBlock?: (block: StudyBlock) => void;
  onMarkBlockDone?: (block: StudyBlock) => void;
  onSkipBlockToday?: (block: StudyBlock) => void;
  onQuickRescheduleBlock?: (block: StudyBlock) => void;
}

// Mapa de dias da semana em português
const dayNamesLong: { [key: string]: string } = {
  'Sunday': 'Domingo',
  'Monday': 'Segunda-feira',
  'Tuesday': 'Terça-feira',
  'Wednesday': 'Quarta-feira',
  'Thursday': 'Quinta-feira',
  'Friday': 'Sexta-feira',
  'Saturday': 'Sábado',
};

export default function DayColumn({
  date,
  blocks,
  dailyLimitMinutes = 0,
  onAdjustDailyLimit,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
  onStartBlock,
  onMarkBlockDone,
  onSkipBlockToday,
  onQuickRescheduleBlock,
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: date.toISOString(),
  });

  const isToday = isSameDay(date, new Date());
  const totalMinutes = blocks
    .filter((b) => !b.isBreak)
    .reduce((sum, b) => sum + b.durationMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const limitHours = dailyLimitMinutes > 0 ? (dailyLimitMinutes / 60).toFixed(1) : null;
  const overMinutes = dailyLimitMinutes > 0 ? Math.max(0, totalMinutes - dailyLimitMinutes) : 0;

  const dayNameEn = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNamePt = dayNamesLong[dayNameEn] || dayNameEn;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'mx-auto flex w-full max-w-[34rem] min-w-0 flex-col md:max-w-none md:min-w-[280px]',
        'rounded-[1.5rem] border bg-gradient-to-b from-[#191C27]/95 to-[#131620]/95 shadow-[0_18px_36px_rgba(0,0,0,0.35)]',
        'md:rounded-2xl md:bg-card-bg/50 md:shadow-none',
        isToday ? 'border-neon-blue/45' : 'border-white/10 md:border-card-border',
        isOver && 'ring-2 ring-neon-blue/30 bg-neon-blue/5'
      )}
    >
      {/* Cabeçalho do Dia */}
      <div
        className={cn(
          'border-b border-white/10 p-3 sm:p-3.5 md:border-card-border',
          isToday && 'bg-neon-blue/10 md:bg-neon-blue/10'
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className={cn(
                'font-heading text-base font-bold sm:text-lg',
                isToday ? 'text-neon-blue' : 'text-white'
              )}
            >
              {dayNamePt}
            </h3>
            <p className="text-xs text-text-secondary sm:text-sm">
              {date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          {isToday && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-2 py-1 text-xs font-medium rounded-full bg-neon-blue/20 text-neon-blue"
            >
              Hoje
            </motion.span>
          )}
        </div>

        {/* Estatísticas do Dia */}
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-text-secondary">
          <span>{blocks.filter((b) => !b.isBreak).length} blocos</span>
          <span className="font-semibold text-white">{totalHours}h</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-text-secondary">
          <span>Capacidade: {limitHours ? `${limitHours}h` : 'livre'}</span>
          {onAdjustDailyLimit && (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => onAdjustDailyLimit(date, -30)}
                className="min-h-[34px] min-w-[60px] rounded-lg border border-white/15 bg-white/[0.02] px-2 py-1 text-xs text-text-secondary transition-colors hover:border-neon-blue/50 hover:text-neon-blue"
                aria-label="Reduzir limite diario em 30 minutos"
              >
                -30m
              </button>
              <button
                type="button"
                onClick={() => onAdjustDailyLimit(date, 30)}
                className="min-h-[34px] min-w-[60px] rounded-lg border border-white/15 bg-white/[0.02] px-2 py-1 text-xs text-text-secondary transition-colors hover:border-neon-blue/50 hover:text-neon-blue"
                aria-label="Aumentar limite diario em 30 minutos"
              >
                +30m
              </button>
            </div>
          )}
        </div>
        {overMinutes > 0 && (
          <p className="mt-2 text-xs text-red-400">
            Excedente: {(overMinutes / 60).toFixed(1)}h
          </p>
        )}

      </div>

      {/* Container de Blocos */}
      <div className="space-y-2 overflow-visible p-2 sm:p-2.5">
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
              <p className="text-sm text-text-muted">Nenhum bloco agendado</p>
              <p className="mt-1 text-xs text-text-muted">Clique em + para adicionar um bloco</p>
            </div>
          ) : (
            blocks.map((block) => (
              <TimeBlock
                key={block.id}
                block={block}
                onStart={onStartBlock}
                onMarkDone={onMarkBlockDone}
                onSkipToday={onSkipBlockToday}
                onQuickReschedule={onQuickRescheduleBlock}
                onEdit={onEditBlock}
                onDelete={onDeleteBlock}
              />
            ))
          )}
        </SortableContext>
      </div>

      {/* Botão Adicionar Bloco */}
      <div className="border-t border-white/10 p-3 md:border-card-border">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onAddBlock(date)}
          className={cn(
            'flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.02] p-3 text-sm text-text-secondary',
            'hover:border-neon-blue/50 hover:bg-neon-blue/5 hover:text-neon-blue',
            'transition-all duration-200'
          )}
        >
          <Plus className="w-4 h-4" />
          Adicionar Bloco
        </motion.button>
      </div>
    </div>
  );
}
