'use client';

/**
 * WeeklyChart Component
 * Gráfico de barras mostrando horas de estudo por dia da semana
 */

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import Card from '@/components/ui/Card';

interface WeeklyChartProps {
  data: {
    day: string;
    hours: number;
    target: number;
  }[];
  className?: string;
}

// Componente de tooltip personalizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-sm text-neon-blue">
          {payload[0].value.toFixed(1)}h estudadas
        </p>
        <p className="text-xs text-text-muted">
          Meta: {payload[0].payload.target}h
        </p>
      </div>
    );
  }
  return null;
};

export default function WeeklyChart({ data, className }: WeeklyChartProps) {
  // Calcular se cada dia atingiu a meta
  const processedData = data.map((item) => ({
    ...item,
    metTarget: item.target > 0 && item.hours >= item.target,
  }));

  return (
    <Card className={cn('h-full', className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-heading font-bold text-white">Progresso Semanal</h2>
          <p className="text-sm text-text-secondary mt-1">
            Horas de estudo esta semana
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple" />
            <span className="text-xs text-text-secondary">Realizado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neon-cyan/50" />
            <span className="text-xs text-text-secondary">Meta</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData} barGap={8}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8892A6', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8892A6', fontSize: 12 }}
              tickFormatter={(value) => `${value}h`}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar
              dataKey="hours"
              radius={[8, 8, 0, 0]}
              maxBarSize={40}
            >
              {processedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.metTarget ? 'url(#gradientSuccess)' : 'url(#gradientBar)'}
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="gradientBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7F00FF" stopOpacity={1} />
                <stop offset="100%" stopColor="#00B4FF" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="gradientSuccess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FFC8" stopOpacity={1} />
                <stop offset="100%" stopColor="#00B4FF" stopOpacity={0.6} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-card-border">
        <div>
          <p className="text-2xl font-heading font-bold text-white">
            {data.reduce((sum, d) => sum + d.hours, 0).toFixed(1)}h
          </p>
          <p className="text-xs text-text-secondary">Total esta semana</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-heading font-bold text-neon-cyan">
            {data.filter((d) => d.target > 0 && d.hours >= d.target).length}/7
          </p>
          <p className="text-xs text-text-secondary">Dias com meta atingida</p>
        </div>
      </div>
    </Card>
  );
}
