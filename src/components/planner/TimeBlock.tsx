'use client';

/**
 * TimeBlock Component
 * Bloco de estudo arrastável para o planner
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, Coffee, Trash2, Edit, Play } from 'lucide-react';
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

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'group relative p-4 rounded-xl border bg-card-bg',
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

      <div className="flex items-center gap-3 ml-2">
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
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onStart && !block.isBreak && (
            <button
              onClick={() => onStart(block)}
              className="p-2 rounded-lg hover:bg-neon-blue/10 text-neon-blue hover:text-neon-cyan transition-colors"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          {onEdit && !block.isBreak && (
            <button
              onClick={() => onEdit(block)}
              className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(block.id)}
              className="p-2 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
