'use client';

/**
 * TimeBlock Component
 * Bloco de estudo arrastável para o planner
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import {
  GripVertical,
  Coffee,
  Trash2,
  Edit,
  Play,
  BookOpen,
  PenTool,
  Repeat,
  Timer,
  CheckCircle2,
  SkipForward,
  CalendarClock,
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { getStudyBlockDisplayTitle } from '@/lib/studyBlockLabels';
import type { StudyBlock } from '@/types';

interface TimeBlockProps {
  block: StudyBlock;
  onEdit?: (block: StudyBlock) => void;
  onDelete?: (blockId: string) => void;
  onStart?: (block: StudyBlock) => void;
  onMarkDone?: (block: StudyBlock) => void;
  onSkipToday?: (block: StudyBlock) => void;
  onQuickReschedule?: (block: StudyBlock) => void;
  isDragging?: boolean;
}

export default function TimeBlock({
  block,
  onEdit,
  onDelete,
  onStart,
  onMarkDone,
  onSkipToday,
  onQuickReschedule,
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
    scheduled: 'border-white/10 bg-[#171A24]/95',
    'in-progress': 'border-yellow-500/45 bg-yellow-500/10',
    completed: 'border-neon-cyan/45 bg-neon-cyan/10',
    skipped: 'border-red-500/30 bg-red-500/10 opacity-60',
    rescheduled: 'border-amber-400/40 bg-amber-400/10',
  };
  const statusLabelMap: Record<StudyBlock['status'], string> = {
    scheduled: 'Pendente',
    'in-progress': 'Em andamento',
    completed: 'Concluido',
    skipped: 'Pulado',
    rescheduled: 'Reagendado',
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
        'group relative rounded-2xl border p-3 sm:p-4',
        'transition-all duration-200',
        statusColors[block.status],
        isDragging && 'shadow-lg shadow-neon-blue/20 z-50'
      )}
    >
      {/* Indicador de cor */}
      {!block.isBreak && block.subject && (
        <div
          className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl"
          style={{ backgroundColor: block.subject.color }}
        />
      )}

      <div className="ml-1.5 sm:ml-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* Alça de Arrastar */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="h-10 w-10 sm:h-9 sm:w-9 cursor-grab active:cursor-grabbing rounded-xl hover:bg-white/5"
          aria-label="Arrastar bloco"
        >
          <GripVertical className="w-4 h-4 text-text-muted" />
        </button>

        {/* Conteúdo do Bloco */}
        <div className="min-w-0 flex-1">
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
              {getStudyBlockDisplayTitle(block)}
            </h4>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <span className="text-text-muted">
              {formatDuration(block.durationMinutes)}
            </span>
            {!block.isBreak && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-text-secondary">
                {statusLabelMap[block.status]}
              </span>
            )}
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
            {!block.isBreak && block.pedagogicalStepIndex && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-text-secondary">
                Ciclo {block.pedagogicalStepIndex}/{block.pedagogicalStepTotal ?? 4}
              </span>
            )}
          </div>

          {!block.isBreak && block.topicName && (
            <p className="mt-1 text-[11px] text-neon-cyan/90 truncate">
              Topico: {block.topicName}
            </p>
          )}

          {!block.isBreak && block.description && (
            <p className="mt-2 text-xs text-text-muted line-clamp-2">
              {block.description}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="flex w-full flex-wrap items-center gap-1 border-t border-white/10 pt-2 pl-[3rem] sm:w-auto sm:flex-nowrap sm:border-t-0 sm:pt-0 sm:pl-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {!block.isBreak && onMarkDone && block.status !== 'completed' && (
            <button
              type="button"
              onClick={() => onMarkDone(block)}
              className="h-10 w-10 rounded-xl sm:h-9 sm:w-9 hover:bg-emerald-500/10 text-emerald-300 hover:text-emerald-200 transition-colors"
              aria-label="Concluir bloco"
              title="Concluir"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {!block.isBreak && onSkipToday && block.status !== 'completed' && (
            <button
              type="button"
              onClick={() => onSkipToday(block)}
              className="h-10 w-10 rounded-xl sm:h-9 sm:w-9 hover:bg-red-500/10 text-red-300 hover:text-red-200 transition-colors"
              aria-label="Pular hoje"
              title="Pular hoje"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          )}
          {!block.isBreak && onQuickReschedule && block.status !== 'completed' && (
            <button
              type="button"
              onClick={() => onQuickReschedule(block)}
              className="h-10 w-10 rounded-xl sm:h-9 sm:w-9 hover:bg-amber-500/10 text-amber-300 hover:text-amber-200 transition-colors"
              aria-label="Reagendar bloco"
              title="Reagendar"
            >
              <CalendarClock className="w-4 h-4" />
            </button>
          )}
          {onStart && (
            <button
              type="button"
              onClick={() => onStart(block)}
              className={cn(
                'h-10 w-10 rounded-xl sm:h-9 sm:w-9 transition-colors',
                block.isBreak
                  ? 'hover:bg-neon-cyan/10 text-neon-cyan hover:text-neon-cyan'
                  : 'hover:bg-neon-blue/10 text-neon-blue hover:text-neon-cyan'
              )}
              aria-label={block.isBreak ? 'Iniciar intervalo' : 'Iniciar bloco'}
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          {onEdit && !block.isBreak && (
            <button
              type="button"
              onClick={() => onEdit(block)}
              className="h-10 w-10 rounded-xl sm:h-9 sm:w-9 hover:bg-white/5 text-text-secondary hover:text-white transition-colors"
              aria-label="Editar bloco"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(block.id)}
              className="h-10 w-10 rounded-xl sm:h-9 sm:w-9 hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors"
              aria-label="Excluir bloco"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
