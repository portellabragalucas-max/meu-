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
import { cn, getDayName, formatDate, isSameDay } from '@/lib/utils';
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
        'flex flex-col w-full min-w-0 md:min-w-[280px] h-full',
        'rounded-xl border bg-card-bg/50',
        isToday ? 'border-neon-blue/50' : 'border-card-border',
        isOver && 'ring-2 ring-neon-blue/30 bg-neon-blue/5'
      )}
    >
      {/* Cabeçalho do Dia */}
      <div
        className={cn(
          'p-3 sm:p-4 border-b border-card-border',
          isToday && 'bg-neon-blue/10'
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className={cn(
                'font-heading font-bold',
                isToday ? 'text-neon-blue' : 'text-white'
              )}
            >
              {dayNamePt}
            </h3>
            <p className="text-sm text-text-secondary">
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
        <div className="mt-3 flex items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="text-text-secondary">
            {blocks.filter((b) => !b.isBreak).length} blocos
          </span>
          <span className="text-white font-medium">{totalHours}h planejadas</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
          <span>
            Capacidade: {limitHours ? `${limitHours}h` : 'livre'}
          </span>
          {onAdjustDailyLimit && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onAdjustDailyLimit(date, -30)}
                className="min-h-[44px] min-w-[44px] rounded-md border border-card-border px-2 py-1 hover:border-neon-blue/50 hover:text-neon-blue transition-colors"
                aria-label="Reduzir limite diario em 30 minutos"
              >
                -30m
              </button>
              <button
                type="button"
                onClick={() => onAdjustDailyLimit(date, 30)}
                className="min-h-[44px] min-w-[44px] rounded-md border border-card-border px-2 py-1 hover:border-neon-blue/50 hover:text-neon-blue transition-colors"
                aria-label="Aumentar limite diario em 30 minutos"
              >
                +30m
              </button>
            </div>
          )}
        </div>
        {overMinutes > 0 && (
          <p className="mt-1 text-xs text-red-400">
            Excedente: {(overMinutes / 60).toFixed(1)}h
          </p>
        )}

      </div>

      {/* Container de Blocos */}
      <div className="flex-1 p-3 space-y-2 overflow-visible md:overflow-y-auto">
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <p className="text-sm text-text-muted">Nenhum bloco agendado</p>
              <p className="text-xs text-text-muted mt-1">
                Clique em + para adicionar um bloco
              </p>
            </div>
          ) : (
            blocks.map((block) => (
              <TimeBlock
                key={block.id}
                block={block}
                onStart={onStartBlock}
                onEdit={onEditBlock}
                onDelete={onDeleteBlock}
              />
            ))
          )}
        </SortableContext>
      </div>

      {/* Botão Adicionar Bloco */}
      <div className="p-3 border-t border-card-border">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onAddBlock(date)}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'p-3 rounded-xl border border-dashed min-h-[44px]',
            'text-sm text-text-secondary',
            'border-card-border hover:border-neon-blue/50',
            'hover:bg-neon-blue/5 hover:text-neon-blue',
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
