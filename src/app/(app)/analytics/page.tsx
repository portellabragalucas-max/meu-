'use client';

/**
 * Analytics Page
 * Análises abrangentes de produtividade e visualizações
 */

import { motion } from 'framer-motion';
import { useMemo, useEffect, useState } from 'react';
import {
  Clock,
  Target,
  TrendingUp,
  Brain,
  Calendar,
  Award,
} from 'lucide-react';
import { StatsCard, Card } from '@/components/ui';
import { useLocalStorage } from '@/hooks';
import {
  ProductivityChart,
  SubjectDistribution,
  ActivityHeatmap,
} from '@/components/analytics';
import type { AnalyticsStore, Subject } from '@/types';

const emptyAnalytics: AnalyticsStore = { daily: {} };

// Variantes de animação
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AnalyticsPage() {
  const [analytics] = useLocalStorage<AnalyticsStore>('nexora_analytics', emptyAnalytics);
  const [subjects] = useLocalStorage<Subject[]>('nexora_subjects', []);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = useMemo(() => (mounted ? new Date() : null), [mounted]);

  const productivityData = useMemo(() => {
    if (!now) return [];
    const data: { date: string; focusScore: number; productivityScore: number; hours: number }[] = [];
    const today = now;

    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const hours = analytics.daily[dateKey]?.hours ?? 0;

      data.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        focusScore: hours > 0 ? 80 : 0,
        productivityScore: hours > 0 ? 75 : 0,
        hours,
      });
    }

    return data;
  }, [analytics, now]);

  const subjectDistribution = useMemo(
    () =>
      subjects
        .filter((subject) => (subject.totalHours || 0) > 0)
        .map((subject) => ({
          name: subject.name,
          hours: Number((subject.totalHours || 0).toFixed(1)),
          color: subject.color,
        })),
    [subjects]
  );

  const heatmapData = useMemo(() => {
    if (!now) return [];
    const data: { date: string; hours: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];
    const today = now;

    for (let i = 84; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const hours = analytics.daily[dateKey]?.hours ?? 0;

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (hours > 0 && hours < 1) level = 1;
      else if (hours >= 1 && hours < 2.5) level = 2;
      else if (hours >= 2.5 && hours < 4) level = 3;
      else if (hours >= 4) level = 4;

      data.push({ date: dateKey, hours: Number(hours.toFixed(1)), level });
    }

    return data;
  }, [analytics, now]);

  const totalHours = productivityData.reduce((sum, d) => sum + d.hours, 0);
  const avgFocus =
    productivityData.length > 0
      ? Math.round(
          productivityData.reduce((sum, d) => sum + d.focusScore, 0) /
            productivityData.length
        )
      : 0;
  const avgProductivity =
    productivityData.length > 0
      ? Math.round(
          productivityData.reduce((sum, d) => sum + d.productivityScore, 0) /
            productivityData.length
        )
      : 0;
  const sessionsCompleted = productivityData.filter((d) => d.hours > 0).length;

  if (!mounted) {
    return (
      <div className="space-y-6 max-[479px]:space-y-4">
        <div className="glass-card p-6 max-[479px]:p-4 animate-pulse">
          <h1 className="text-2xl font-heading font-bold text-white">Análises</h1>
          <p className="text-sm text-text-secondary mt-1">Carregando insights...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="app-page max-[479px]:[&>*+*]:mt-3"
    >
      {/* Cabeçalho */}
      <motion.div variants={itemVariants} className="min-w-0">
        <h1 className="text-2xl max-[479px]:text-xl font-heading font-bold text-white">Análises</h1>
        <p className="text-sm max-[479px]:text-xs text-text-secondary mt-1">
          Acompanhe seu desempenho e progresso nos estudos
        </p>
      </motion.div>

      {/* Estatísticas de Resumo */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-[479px]:gap-2"
      >
        <StatsCard
          title="Tempo Total de Estudo"
          titleShort="Tempo"
          value={`${totalHours.toFixed(1)}h`}
          subtitle="Últimos 14 dias"
          icon={Clock}
          trend={{ value: 0, isPositive: false }}
          color="blue"
          variant="mobile"
        />
        <StatsCard
          title="Pontuação Média de Foco"
          titleShort="Foco"
          value={`${avgFocus}%`}
          subtitle="Últimos 14 dias"
          icon={Brain}
          trend={{ value: 0, isPositive: false }}
          color="purple"
          variant="mobile"
        />
        <StatsCard
          title="Produtividade Média"
          titleShort="Prod."
          value={`${avgProductivity}%`}
          subtitle="Últimos 14 dias"
          icon={TrendingUp}
          trend={{ value: 0, isPositive: false }}
          color="cyan"
          variant="mobile"
        />
        <StatsCard
          title="Sessões Concluídas"
          titleShort="Sessões"
          value={sessionsCompleted}
          subtitle="Últimos 14 dias"
          icon={Target}
          color="orange"
          variant="mobile"
        />
      </motion.div>

      {/* Linha de Gráficos */}
      <div className="grid grid-cols-1 gap-4 max-[479px]:gap-3 sm:gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants} className="min-w-0">
          <ProductivityChart data={productivityData} />
        </motion.div>
        <motion.div variants={itemVariants} className="min-w-0">
          <SubjectDistribution data={subjectDistribution} />
        </motion.div>
      </div>

      {/* Mapa de Calor de Atividades */}
      <motion.div variants={itemVariants} className="min-w-0">
        <ActivityHeatmap data={heatmapData} weeks={12} />
      </motion.div>

      {/* Seção de Insights */}
      <motion.div variants={itemVariants} className="min-w-0">
        <Card>
          <h2 className="text-xl max-[479px]:text-lg font-heading font-bold text-white mb-4 max-[479px]:mb-3">
            Insights da IA
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-[479px]:gap-2 sm:gap-4">
            {/* Horário de Pico de Performance */}
            <div className="p-4 max-[479px]:p-3 rounded-xl bg-neon-blue/10 border border-neon-blue/20">
              <div className="flex items-center gap-2 mb-2 max-[479px]:mb-1">
                <Clock className="w-5 h-5 max-[479px]:w-4 max-[479px]:h-4 text-neon-blue" />
                <span className="font-medium text-white">Pico de Performance</span>
              </div>
              <p className="text-2xl max-[479px]:text-[22px] font-heading font-bold text-neon-blue">--</p>
              <p className="text-sm max-[479px]:text-xs text-text-secondary mt-1">Sem dados ainda</p>
            </div>

            {/* Melhor Disciplina */}
            <div className="p-4 max-[479px]:p-3 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
              <div className="flex items-center gap-2 mb-2 max-[479px]:mb-1">
                <Award className="w-5 h-5 max-[479px]:w-4 max-[479px]:h-4 text-neon-purple" />
                <span className="font-medium text-white">Melhor Disciplina</span>
              </div>
              <p className="text-2xl max-[479px]:text-[22px] font-heading font-bold text-neon-purple">--</p>
              <p className="text-sm max-[479px]:text-xs text-text-secondary mt-1">Sem dados ainda</p>
            </div>

            {/* Consistência */}
            <div className="p-4 max-[479px]:p-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
              <div className="flex items-center gap-2 mb-2 max-[479px]:mb-1">
                <Calendar className="w-5 h-5 max-[479px]:w-4 max-[479px]:h-4 text-neon-cyan" />
                <span className="font-medium text-white">Consistência</span>
              </div>
              <p className="text-2xl max-[479px]:text-[22px] font-heading font-bold text-neon-cyan">0%</p>
              <p className="text-sm max-[479px]:text-xs text-text-secondary mt-1">Sem dados ainda</p>
            </div>
          </div>

          {/* Recomendação */}
          <div className="mt-6 max-[479px]:mt-4 p-4 max-[479px]:p-3 rounded-xl bg-gradient-to-r from-neon-blue/5 to-neon-purple/5 border border-card-border">
            <p className="text-sm max-[479px]:text-xs text-text-secondary">
              <span className="text-neon-blue font-medium">💡 Recomendação:</span>{' '}
              Sem recomendações ainda. Inicie seus estudos para gerar insights.
            </p>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
