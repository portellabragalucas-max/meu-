'use client';

/**
 * SubjectDistribution Component
 * Gráfico de pizza mostrando distribuição de tempo entre disciplinas
 */

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui';

interface SubjectDistributionProps {
  data: {
    name: string;
    hours: number;
    color: string;
  }[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-card p-3">
        <p className="text-sm font-medium text-white">{data.name}</p>
        <p className="text-sm" style={{ color: data.color }}>
          {data.hours.toFixed(1)} horas
        </p>
        <p className="text-xs text-text-muted">
          {data.percentage.toFixed(1)}% do total
        </p>
      </div>
    );
  }
  return null;
};

export default function SubjectDistribution({ data }: SubjectDistributionProps) {
  // Calcular porcentagens
  const totalHours = data.reduce((sum, d) => sum + d.hours, 0);
  const dataWithPercentage = data.map((d) => ({
    ...d,
    percentage: totalHours > 0 ? (d.hours / totalHours) * 100 : 0,
  }));

  return (
    <Card className="h-full min-w-0">
      <h2 className="text-xl max-[480px]:text-lg font-heading font-bold text-white mb-2">
        Distribuição por Disciplina
      </h2>
      <p className="text-sm max-[480px]:text-xs text-text-secondary mb-6">
        Tempo dedicado a cada disciplina esta semana
      </p>

      <div className="h-72 max-[480px]:h-56">
        <div className="h-full w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPercentage}
                dataKey="hours"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                stroke="none"
              >
                {dataWithPercentage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legenda */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {dataWithPercentage.map((subject) => (
          <div key={subject.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: subject.color }}
            />
            <span className="text-sm text-text-secondary truncate">
              {subject.name}
            </span>
            <span className="text-sm font-medium text-white ml-auto">
              {subject.hours.toFixed(1)}h
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
