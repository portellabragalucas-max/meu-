'use client';

/**
 * BlockFormModal Component
 * Modal para criar/editar blocos do planner
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { StudyBlock, Subject } from '@/types';

export interface BlockFormData {
  date: Date;
  startTime: string;
  durationMinutes: number;
  isBreak: boolean;
  subjectId: string | null;
}

interface BlockFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BlockFormData) => void;
  subjects: Subject[];
  date: Date;
  block?: StudyBlock | null;
  defaultStartTime?: string;
  defaultDurationMinutes?: number;
}

const DEFAULT_DURATION = 60;

const toDateInputValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
};

const fromDateInputValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function BlockFormModal({
  isOpen,
  onClose,
  onSave,
  subjects,
  date,
  block,
  defaultStartTime = '09:00',
  defaultDurationMinutes = DEFAULT_DURATION,
}: BlockFormModalProps) {
  const [dateValue, setDateValue] = useState(toDateInputValue(date));
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [isBreak, setIsBreak] = useState(false);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subjectOptions = useMemo(() => {
    if (subjects.length > 0) return subjects;
    return [
      {
        id: 'default',
        userId: 'user1',
        name: 'Sessao Livre',
        color: '#00B4FF',
        icon: 'book',
        priority: 5,
        difficulty: 5,
        targetHours: 0,
        completedHours: 0,
        totalHours: 0,
        sessionsCount: 0,
        averageScore: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }, [subjects]);

  useEffect(() => {
    if (!isOpen) return;

    setDateValue(toDateInputValue(block?.date ? new Date(block.date) : date));
    setStartTime(block?.startTime || defaultStartTime);
    setDurationMinutes(block?.durationMinutes || defaultDurationMinutes);
    setIsBreak(Boolean(block?.isBreak));
    setSubjectId(block?.subjectId || subjectOptions[0]?.id || null);
    setError(null);
  }, [
    isOpen,
    block,
    date,
    subjectOptions,
    defaultStartTime,
    defaultDurationMinutes,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!durationMinutes || durationMinutes <= 0) {
      setError('Informe uma duracao valida.');
      return;
    }

    if (!isBreak && !subjectId) {
      setError('Selecione uma disciplina.');
      return;
    }

    onSave({
      date: fromDateInputValue(dateValue),
      startTime,
      durationMinutes,
      isBreak,
      subjectId: isBreak ? null : subjectId,
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <Card className="relative" padding="lg">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-heading font-bold text-white mb-6">
              {block ? 'Editar Bloco' : 'Novo Bloco'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Data
                </label>
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Duracao (min)
                </label>
                <input
                  type="number"
                  min="15"
                  max="240"
                  step="5"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Tipo
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBreak(false)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg border text-sm transition-colors',
                      !isBreak
                        ? 'border-neon-blue/60 text-white bg-neon-blue/10'
                        : 'border-card-border text-text-secondary hover:border-neon-blue/40'
                    )}
                  >
                    Estudo
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBreak(true)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg border text-sm transition-colors',
                      isBreak
                        ? 'border-neon-blue/60 text-white bg-neon-blue/10'
                        : 'border-card-border text-text-secondary hover:border-neon-blue/40'
                    )}
                  >
                    Intervalo
                  </button>
                </div>
              </div>

              {!isBreak && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Disciplina
                  </label>
                  <select
                    value={subjectId || ''}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="input-field"
                    required
                  >
                    {subjectOptions.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  {block ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
