'use client';

/**
 * ProductivityChart Component
 * Gráfico de linha mostrando tendências de produtividade e foco ao longo do tempo
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui';

interface ProductivityChartProps {
  data: {
    date: string;
    focusScore: number;
    productivityScore: number;
    hours: number;
  }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3">
        <p className="text-sm font-medium text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
            {entry.name === 'Horas' ? 'h' : '%'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ProductivityChart({ data }: ProductivityChartProps) {
  return (
    <Card className="h-full min-w-0">
      <h2 className="text-xl max-[480px]:text-lg font-heading font-bold text-white mb-2">
        Tendências de Produtividade
      </h2>
      <p className="text-sm max-[480px]:text-xs text-text-secondary mb-6">
        Acompanhe seu foco e produtividade ao longo do tempo
      </p>

      <div className="h-72 max-[480px]:h-56">
        <div className="h-full w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0, 180, 255, 0.1)"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8892A6', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8892A6', fontSize: 12 }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => (
                  <span className="text-sm text-text-secondary">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="focusScore"
                name="Foco"
                stroke="#00B4FF"
                strokeWidth={2}
                dot={{ fill: '#00B4FF', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: '#00B4FF', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="productivityScore"
                name="Produtividade"
                stroke="#7F00FF"
                strokeWidth={2}
                dot={{ fill: '#7F00FF', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: '#7F00FF', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
