'use client';

/**
 * ActivityHeatmap Component
 * Mapa de calor estilo GitHub mostrando consistência nos estudos
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui';

interface HeatmapData {
  date: string;
  hours: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
  weeks?: number;
}

const levelColors = [
  'bg-card-bg',           // 0 - sem atividade
  'bg-neon-blue/20',      // 1 - atividade leve
  'bg-neon-blue/40',      // 2 - atividade moderada
  'bg-neon-blue/60',      // 3 - boa atividade
  'bg-neon-blue',         // 4 - alta atividade
];

const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function ActivityHeatmap({
  data,
  weeks = 12,
}: ActivityHeatmapProps) {
  // Gerar dados da grade para as semanas especificadas
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeks * 7) + 1);

  // Criar um mapa para busca rápida
  const dataMap = new Map(data.map((d) => [d.date, d]));

  // Gerar semanas
  const weeksData: HeatmapData[][] = [];
  let currentDate = new Date(startDate);

  // Ajustar para começar do domingo
  const dayOfWeek = currentDate.getDay();
  currentDate.setDate(currentDate.getDate() - dayOfWeek);

  for (let week = 0; week < weeks; week++) {
    const weekData: HeatmapData[] = [];
    for (let day = 0; day < 7; day++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existingData = dataMap.get(dateStr);
      weekData.push(
        existingData || {
          date: dateStr,
          hours: 0,
          level: 0,
        }
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeksData.push(weekData);
  }

  // Calcular totais
  const totalHours = data.reduce((sum, d) => sum + d.hours, 0);
  const activeDays = data.filter((d) => d.hours > 0).length;

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-heading font-bold text-white">
            Mapa de Atividades
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Sua consistência de estudos nas últimas {weeks} semanas
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-text-secondary">Total: </span>
            <span className="font-bold text-white">{totalHours.toFixed(1)}h</span>
          </div>
          <div>
            <span className="text-text-secondary">Dias Ativos: </span>
            <span className="font-bold text-neon-cyan">{activeDays}</span>
          </div>
        </div>
      </div>

      {/* Grade do Mapa de Calor */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Rótulos dos dias */}
          <div className="flex mb-2 ml-8">
            {dayLabels.map((day, i) => (
              <div
                key={day}
                className="text-xs text-text-muted"
                style={{
                  width: 14,
                  marginRight: 3,
                  visibility: i % 2 === 1 ? 'visible' : 'hidden',
                }}
              >
                {day.slice(0, 1)}
              </div>
            ))}
          </div>

          {/* Grade */}
          <div className="flex gap-1">
            {/* Rótulos dos meses iriam aqui */}
            <div className="w-6" />

            {weeksData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <motion.div
                    key={day.date}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: (weekIndex * 7 + dayIndex) * 0.002 }}
                    className="relative group"
                  >
                    <div
                      className={cn(
                        'w-[14px] h-[14px] rounded-sm border border-card-border',
                        levelColors[day.level],
                        day.level > 0 && 'border-transparent'
                      )}
                    />

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="glass-card px-2 py-1 text-xs whitespace-nowrap">
                        <div className="font-medium text-white">
                          {new Date(day.date).toLocaleDateString('pt-BR', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-text-secondary">
                          {day.hours > 0
                            ? `${day.hours.toFixed(1)} horas`
                            : 'Sem atividade'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-xs text-text-muted">Menos</span>
        {levelColors.map((color, i) => (
          <div
            key={i}
            className={cn('w-3 h-3 rounded-sm', color, i > 0 && 'border-none')}
            style={{ borderColor: i === 0 ? 'rgba(0,180,255,0.2)' : 'transparent' }}
          />
        ))}
        <span className="text-xs text-text-muted">Mais</span>
      </div>
    </Card>
  );
}
