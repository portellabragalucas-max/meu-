'use client';

/**
 * TodayPlan Component
 * Exibe os blocos de estudo do dia com horário e status
 */

import { motion } from 'framer-motion';
import { Clock, Play, CheckCircle2, SkipForward, Coffee } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { StudyBlock } from '@/types';

interface TodayPlanProps {
  blocks: StudyBlock[];
  onStartSession: (blockId: string) => void;
  onSkipBlock: (blockId: string) => void;
  onCompleteBlock?: (blockId: string, minutesSpent?: number) => void;
  onStartBlock?: (block: StudyBlock) => void;
  title?: string;
  subtitle?: string;
}

const statusConfig = {
  scheduled: { badge: 'default', icon: Clock, label: 'Agendado' },
  'in-progress': { badge: 'warning', icon: Play, label: 'Em Andamento' },
  completed: { badge: 'success', icon: CheckCircle2, label: 'Concluído' },
  skipped: { badge: 'danger', icon: SkipForward, label: 'Pulado' },
} as const;

export default function TodayPlan({
  blocks,
  onStartSession,
  onSkipBlock,
  onCompleteBlock,
  onStartBlock,
  title = 'Plano de Hoje',
  subtitle,
}: TodayPlanProps) {
  const currentTime = new Date().toTimeString().slice(0, 5);
  
  // Encontrar bloco atual ou próximo
  const currentBlockIndex = blocks.findIndex(
    (block) => block.status === 'scheduled' && block.startTime <= currentTime && block.endTime > currentTime
  );
  const nextBlockIndex = blocks.findIndex(
    (block) => block.status === 'scheduled' && block.startTime > currentTime
  );

  return (
    <Card className="h-full" padding="none">
      <div className="p-6 border-b border-card-border">
        <h2 className="text-xl font-heading font-bold text-white">{title}</h2>
        <p className="text-sm text-text-secondary mt-1">
          {subtitle ??
            `${blocks.filter((b) => b.status === 'completed').length} de ${blocks.length} concluídos`}
        </p>
      </div>

      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {blocks.length === 0 ? (
          <div className="text-center py-8">
            <Coffee className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary">Nenhum bloco agendado para hoje</p>
            <p className="text-sm text-text-muted mt-1">
              Vá para Agenda Inteligente para gerar um cronograma
            </p>
          </div>
        ) : (
          blocks.map((block, index) => {
            const config = statusConfig[block.status];
            const Icon = config.icon;
            const isActive = index === currentBlockIndex;
            const isNext = index === nextBlockIndex && currentBlockIndex === -1;

            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'relative p-4 rounded-xl border transition-all duration-200',
                  block.isBreak
                    ? 'bg-neon-cyan/5 border-neon-cyan/20'
                    : 'bg-card-bg border-card-border',
                  isActive && 'ring-2 ring-neon-blue shadow-neon-blue',
                  isNext && 'ring-2 ring-neon-purple/50',
                  block.status === 'completed' && 'opacity-60',
                  block.status === 'skipped' && 'opacity-40'
                )}
              >
                {/* Linha indicadora de cor */}
                {block.subject && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ backgroundColor: block.subject.color }}
                  />
                )}

                <div className="flex items-start justify-between ml-2">
                  <div className="flex-1">
                    {/* Título do Bloco */}
                    <div className="flex items-center gap-2">
                      {block.isBreak ? (
                        <Coffee className="w-4 h-4 text-neon-cyan" />
                      ) : (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: block.subject?.color || '#00B4FF' }}
                        />
                      )}
                      <h4 className="font-medium text-white">
                        {block.isBreak ? 'Intervalo' : block.subject?.name || 'Bloco de Estudo'}
                      </h4>
                    </div>

                    {/* Informações de Horário */}
                    <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
                      <span>{formatDuration(block.durationMinutes)}</span>
                    </div>
                  </div>

                  {/* Status e Ações */}
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={config.badge as 'default' | 'success' | 'warning' | 'danger'} size="sm">
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>

                    <div className="flex gap-2">
                      {onStartBlock && (
                        <Button
                          variant={block.isBreak ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => onStartBlock(block)}
                        >
                          <Play className="w-3 h-3" />
                          Iniciar
                        </Button>
                      )}
                      {block.status === 'scheduled' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSkipBlock(block.id)}
                        >
                          Pular
                        </Button>
                      )}
                      {onCompleteBlock && block.status !== 'completed' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onCompleteBlock(block.id)}
                        >
                          Concluir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Indicador ativo */}
                {isActive && (
                  <motion.div
                    className="absolute -right-1 -top-1 w-3 h-3 bg-neon-blue rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </Card>
  );
}


