'use client';

/**
 * SubjectCard Component
 * Exibe uma disciplina com estatísticas e ações
 */

import { motion } from 'framer-motion';
import {
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  Edit,
  Trash2,
  MoreVertical,
  Star,
} from 'lucide-react';
import { cn, formatDuration, percentage } from '@/lib/utils';
import { Card, Badge, ProgressBar, Button } from '@/components/ui';
import type { Subject } from '@/types';

interface SubjectCardProps {
  subject: Subject;
  onEdit: (subject: Subject) => void;
  onDelete: (subjectId: string) => void;
}

const difficultyLabels = ['Muito Fácil', 'Fácil', 'Médio', 'Difícil', 'Muito Difícil'];

export default function SubjectCard({
  subject,
  onEdit,
  onDelete,
}: SubjectCardProps) {
  const completionPercent = percentage(subject.completedHours, subject.targetHours);
  const difficultyLabel = difficultyLabels[Math.floor((subject.difficulty - 1) / 2)];

  return (
    <Card className="group relative overflow-visible" glow="none" padding="none">
      {/* Cabeçalho Colorido */}
      <div
        className="h-2 rounded-t-xl"
        style={{ backgroundColor: subject.color }}
      />

      <div className="p-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${subject.color}20` }}
            >
              <BookOpen
                className="w-6 h-6"
                style={{ color: subject.color }}
              />
            </div>
            <div>
              <h3 className="font-heading font-bold text-white text-lg">
                {subject.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    subject.priority >= 8
                      ? 'danger'
                      : subject.priority >= 5
                      ? 'warning'
                      : 'default'
                  }
                  size="sm"
                >
                  P{subject.priority}
                </Badge>
                <span className="text-xs text-text-muted">{difficultyLabel}</span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={() => onEdit(subject)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(subject.id)}
              className="hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progresso Semanal */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Progresso Semanal</span>
            <span className="text-sm font-medium text-white">
              {subject.completedHours}h / {subject.targetHours}h
            </span>
          </div>
          <ProgressBar
            value={subject.completedHours}
            max={subject.targetHours}
            color={completionPercent >= 100 ? 'cyan' : 'blue'}
            size="md"
          />
        </div>

        {/* Grid de Estatísticas */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-card-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-text-muted mb-1">
              <Clock className="w-3 h-3" />
            </div>
            <p className="text-lg font-bold text-white">{subject.totalHours}h</p>
            <p className="text-xs text-text-muted">Total</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-text-muted mb-1">
              <Target className="w-3 h-3" />
            </div>
            <p className="text-lg font-bold text-white">{subject.sessionsCount}</p>
            <p className="text-xs text-text-muted">Sessões</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-text-muted mb-1">
              <Star className="w-3 h-3" />
            </div>
            <p className="text-lg font-bold text-white">{subject.averageScore}%</p>
            <p className="text-xs text-text-muted">Média</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
