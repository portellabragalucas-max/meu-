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
  titleShort?: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'purple' | 'cyan' | 'orange';
  variant?: 'default' | 'mobile';
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
  titleShort,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  variant = 'default',
  className,
}: StatsCardProps) {
  const styles = colorStyles[color];
  const isMobile = variant === 'mobile';
  const displayTitle = isMobile && titleShort ? titleShort : title;

  return (
    <Card
      className={cn(
        'stats-card',
        isMobile ? 'p-3 sm:p-6' : 'p-4 sm:p-6',
        'max-[480px]:rounded-xl',
        className
      )}
      glow={styles.glow as 'blue' | 'purple' | 'cyan' | 'none'}
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className={cn(
            isMobile
              ? 'w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center'
              : 'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center',
            styles.iconBg
          )}
        >
          <Icon
            className={cn(
              isMobile ? 'w-4 h-4 sm:w-6 sm:h-6' : 'w-5 h-5 sm:w-6 sm:h-6',
              styles.iconColor
            )}
          />
        </motion.div>

        {/* Trend Indicator */}
        {trend && (
          <div
            className={cn(
              isMobile ? 'flex items-center gap-1 text-[11px] font-medium' : 'flex items-center gap-1 text-sm font-medium',
              trend.isPositive ? 'text-neon-cyan' : 'text-red-400'
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className={cn(isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
            ) : (
              <TrendingDown className={cn(isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className={cn(isMobile ? 'mt-2' : 'mt-3')}>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            isMobile ? 'text-xl sm:text-3xl max-[480px]:text-[22px]' : 'text-2xl sm:text-3xl',
            'font-heading font-bold text-white'
          )}
        >
          {value}
        </motion.h3>
        <p className={cn(isMobile ? 'text-xs max-[480px]:text-[12px]' : 'text-sm', 'text-text-secondary mt-1')}>
          {displayTitle}
        </p>
        {subtitle && (
          <p className={cn(isMobile ? 'hidden sm:block text-xs text-text-muted mt-1' : 'text-xs text-text-muted mt-1')}>
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
}
