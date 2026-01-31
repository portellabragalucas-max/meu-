'use client';

/**
 * StatsCard Component
 * Displays a single statistic with icon and trend indicator
 */

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Card from './Card';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'purple' | 'cyan' | 'orange';
  className?: string;
}

const colorStyles = {
  blue: {
    iconBg: 'bg-neon-blue/20',
    iconColor: 'text-neon-blue',
    glow: 'blue',
  },
  purple: {
    iconBg: 'bg-neon-purple/20',
    iconColor: 'text-neon-purple',
    glow: 'purple',
  },
  cyan: {
    iconBg: 'bg-neon-cyan/20',
    iconColor: 'text-neon-cyan',
    glow: 'cyan',
  },
  orange: {
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-500',
    glow: 'none',
  },
} as const;

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  className,
}: StatsCardProps) {
  const styles = colorStyles[color];

  return (
    <Card className={cn('stats-card', className)} glow={styles.glow as 'blue' | 'purple' | 'cyan' | 'none'}>
      <div className="flex items-start justify-between">
        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            styles.iconBg
          )}
        >
          <Icon className={cn('w-6 h-6', styles.iconColor)} />
        </motion.div>

        {/* Trend Indicator */}
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              trend.isPositive ? 'text-neon-cyan' : 'text-red-400'
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-4">
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-heading font-bold text-white"
        >
          {value}
        </motion.h3>
        <p className="text-sm text-text-secondary mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-text-muted mt-1">{subtitle}</p>
        )}
      </div>
    </Card>
  );
}
