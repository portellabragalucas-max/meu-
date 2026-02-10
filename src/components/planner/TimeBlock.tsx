'use client';

/**
 * TimeBlock Component
 * Bloco de estudo arrastável para o planner
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, Coffee, Trash2, Edit, Play, BookOpen, PenTool, Repeat, Timer } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import type { StudyBlock } from '@/types';

interface TimeBlockProps {
  block: StudyBlock;
  onEdit?: (block: StudyBlock) => void;
  onDelete?: (blockId: string) => void;
  onStart?: (block: StudyBlock) => void;
  isDragging?: boolean;
}

export default function TimeBlock({
  block,
  onEdit,
  onDelete,
  onStart,
  isDragging = false,
}: TimeBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusColors = {
    scheduled: 'border-card-border',
    'in-progress': 'border-yellow-500/50 bg-yellow-500/5',
    completed: 'border-neon-cyan/50 bg-neon-cyan/5',
    skipped: 'border-red-500/30 bg-red-500/5 opacity-50',
  };

  const typeBadge = block.type
    ? {
        AULA: { label: 'Aula', icon: BookOpen, className: 'bg-neon-blue/15 text-neon-blue border-neon-blue/30' },
        EXERCICIOS: { label: 'Exercicios', icon: PenTool, className: 'bg-neon-purple/15 text-neon-purple border-neon-purple/30' },
        REVISAO: { label: 'Revisao', icon: Repeat, className: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' },
        SIMULADO_AREA: { label: 'Simulado (Area)', icon: Timer, className: 'bg-amber-400/15 text-amber-300 border-amber-400/30' },
        SIMULADO_COMPLETO: { label: 'Simulado (Completo)', icon: Timer, className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
        ANALISE: { label: 'Correcao', icon: Repeat, className: 'bg-slate-400/15 text-slate-200 border-slate-400/30' },
      }[block.type]
    : null;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'group relative p-3 sm:p-4 rounded-xl border bg-card-bg',
        'transition-all duration-200',
        statusColors[block.status],
        isDragging && 'shadow-lg shadow-neon-blue/20 z-50'
      )}
    >
      {/* Indicador de cor */}
      {!block.isBreak && block.subject && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
          style={{ backgroundColor: block.subject.color }}
        />
      )}

      <div className="flex items-center gap-2 sm:gap-3 ml-1.5 sm:ml-2">
        {/* Alça de Arrastar */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/5"
        >
          <GripVertical className="w-4 h-4 text-text-muted" />
        </button>

        {/* Conteúdo do Bloco */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {block.isBreak ? (
              <Coffee className="w-4 h-4 text-neon-cyan" />
            ) : (
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: block.subject?.color || '#00B4FF' }}
              />
            )}
            <h4 className="font-medium text-white truncate">
              {block.isBreak ? 'Intervalo' : block.subject?.name || 'Bloco de Estudo'}
            </h4>
          </div>

          <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
            <span className="text-text-muted">
              {formatDuration(block.durationMinutes)}
            </span>
            {typeBadge && !block.isBreak && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  typeBadge.className
                )}
              >
                <typeBadge.icon className="w-3 h-3" />
                {typeBadge.label}
              </span>
            )}
          </div>

          {!block.isBreak && block.description && (
            <p className="mt-2 text-xs text-text-muted line-clamp-2">
              {block.description}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {onStart && (
            <button
              onClick={() => onStart(block)}
              className={cn(
                'p-2.5 rounded-lg transition-colors',
                block.isBreak
                  ? 'hover:bg-neon-cyan/10 text-neon-cyan hover:text-neon-cyan'
                  : 'hover:bg-neon-blue/10 text-neon-blue hover:text-neon-cyan'
              )}
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          {onEdit && !block.isBreak && (
            <button
              onClick={() => onEdit(block)}
              className="p-2.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(block.id)}
              className="p-2.5 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
