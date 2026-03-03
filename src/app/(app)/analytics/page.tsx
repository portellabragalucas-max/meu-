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
import { computeIntelligentAnalyticsSummary } from '@/services/adaptiveStudyIntelligence';
import { formatHoursDuration } from '@/lib/utils';
import type { AnalyticsStore, StudyBlock, Subject } from '@/types';

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
  const [plannerBlocks] = useLocalStorage<StudyBlock[]>('nexora_planner_blocks', []);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = useMemo(() => (mounted ? new Date() : null), [mounted]);

  const completedStats = useMemo(() => {
    const hoursByDate: Record<string, number> = {};
    const sessionsByDate: Record<string, number> = {};
    const hoursBySubject: Record<string, number> = {};

    plannerBlocks.forEach((block) => {
      if (block.isBreak || block.status !== 'completed') return;
      const dateKey = new Date(block.date).toISOString().split('T')[0];
      const hours = block.durationMinutes / 60;
      hoursByDate[dateKey] = (hoursByDate[dateKey] ?? 0) + hours;
      sessionsByDate[dateKey] = (sessionsByDate[dateKey] ?? 0) + 1;

      if (block.subjectId) {
        hoursBySubject[block.subjectId] = (hoursBySubject[block.subjectId] ?? 0) + hours;
      }
    });

    return { hoursByDate, sessionsByDate, hoursBySubject };
  }, [plannerBlocks]);

  const analyticsForSummary = useMemo(() => {
    const mergedDaily = { ...(analytics.daily || {}) };

    Object.entries(completedStats.hoursByDate).forEach(([dateKey, blockHours]) => {
      const current = mergedDaily[dateKey] || { hours: 0, sessions: 0 };
      mergedDaily[dateKey] = {
        ...current,
        hours: Math.max(current.hours ?? 0, blockHours),
        sessions: Math.max(current.sessions ?? 0, completedStats.sessionsByDate[dateKey] ?? 0),
      };
    });

    return {
      ...analytics,
      daily: mergedDaily,
    };
  }, [analytics, completedStats.hoursByDate, completedStats.sessionsByDate]);

  const productivityData = useMemo(() => {
    if (!now) return [];
    const data: { date: string; focusScore: number; productivityScore: number; hours: number }[] = [];
    const today = now;

    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const dayRecord = analytics.daily[dateKey];
      const analyticsHours = dayRecord?.hours ?? 0;
      const blocksHours = completedStats.hoursByDate[dateKey] ?? 0;
      const hours = Math.max(analyticsHours, blocksHours);

      data.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        focusScore: hours > 0 ? Math.round(dayRecord?.focusScoreAvg ?? 80) : 0,
        productivityScore: hours > 0 ? Math.round(dayRecord?.productivityScoreAvg ?? 75) : 0,
        hours,
      });
    }

    return data;
  }, [analytics, completedStats.hoursByDate, now]);

  const subjectDistribution = useMemo(
    () =>
      subjects
        .map((subject) => {
          const storeHours = subject.totalHours || 0;
          const blocksHours = completedStats.hoursBySubject[subject.id] ?? 0;
          return {
            name: subject.name,
            hours: Math.max(storeHours, blocksHours),
            color: subject.color,
          };
        })
        .filter((subject) => subject.hours > 0)
        .map((subject) => ({
          name: subject.name,
          hours: subject.hours,
          color: subject.color,
        })),
    [completedStats.hoursBySubject, subjects]
  );

  const heatmapData = useMemo(() => {
    if (!now) return [];
    const data: { date: string; hours: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];
    const today = now;

    for (let i = 84; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const analyticsHours = analytics.daily[dateKey]?.hours ?? 0;
      const blocksHours = completedStats.hoursByDate[dateKey] ?? 0;
      const hours = Math.max(analyticsHours, blocksHours);

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (hours > 0 && hours < 1) level = 1;
      else if (hours >= 1 && hours < 2.5) level = 2;
      else if (hours >= 2.5 && hours < 4) level = 3;
      else if (hours >= 4) level = 4;

      data.push({ date: dateKey, hours, level });
    }

    return data;
  }, [analytics, completedStats.hoursByDate, now]);

  const totalHours = productivityData.reduce((sum, d) => sum + d.hours, 0);
  const intelligentSummary = useMemo(
    () => computeIntelligentAnalyticsSummary({ analytics: analyticsForSummary, subjects, now: now ?? new Date() }),
    [analyticsForSummary, subjects, now]
  );
  const studiedDays = productivityData.filter((item) => item.hours > 0);
  const avgFocus =
    intelligentSummary.avgFocusScore ||
    (studiedDays.length > 0
      ? Math.round(
          studiedDays.reduce((sum, d) => sum + d.focusScore, 0) /
            studiedDays.length
        )
      : 0);
  const avgProductivity =
    intelligentSummary.avgProductivityScore ||
    (studiedDays.length > 0
      ? Math.round(
          studiedDays.reduce((sum, d) => sum + d.productivityScore, 0) /
            studiedDays.length
        )
      : 0);
  const sessionsCompleted = useMemo(() => {
    if (!now) return 0;
    let total = 0;
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const analyticsSessions = analytics.daily[dateKey]?.sessions ?? 0;
      const blockSessions = completedStats.sessionsByDate[dateKey] ?? 0;
      total += Math.max(analyticsSessions, blockSessions);
    }
    return total;
  }, [analytics, completedStats.sessionsByDate, now]);
  const avgAccuracy = Math.round((intelligentSummary.avgAccuracyRate || 0) * 100);

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
          value={formatHoursDuration(totalHours)}
          subtitle="Últimos 14 dias"
          icon={Clock}
          trend={{ value: 0, isPositive: false }}
          color="blue"
          variant="mobile"
        />
        <StatsCard
          title="Taxa Média de Acerto"
          titleShort="Acerto"
          value={`${avgAccuracy}%`}
          subtitle="Média adaptativa"
          icon={Target}
          trend={{ value: 0, isPositive: avgAccuracy >= 70 }}
          color="purple"
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
          icon={Award}
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
              <p className="text-2xl max-[479px]:text-[22px] font-heading font-bold text-neon-purple">
                {intelligentSummary.strongestSubject?.name ?? '--'}
              </p>
              <p className="text-sm max-[479px]:text-xs text-text-secondary mt-1">
                {intelligentSummary.strongestSubject
                  ? `${Math.round(intelligentSummary.strongestSubject.accuracyRate * 100)}% de acerto`
                  : 'Sem dados ainda'}
              </p>
            </div>

            {/* Matéria mais fraca */}
            <div className="p-4 max-[479px]:p-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
              <div className="flex items-center gap-2 mb-2 max-[479px]:mb-1">
                <Calendar className="w-5 h-5 max-[479px]:w-4 max-[479px]:h-4 text-neon-cyan" />
                <span className="font-medium text-white">Matéria Mais Fraca</span>
              </div>
              <p className="text-2xl max-[479px]:text-[22px] font-heading font-bold text-neon-cyan">
                {intelligentSummary.weakestSubject?.name ?? '--'}
              </p>
              <p className="text-sm max-[479px]:text-xs text-text-secondary mt-1">
                {intelligentSummary.weakestSubject
                  ? `${Math.round(intelligentSummary.weakestSubject.accuracyRate * 100)}% de acerto`
                  : 'Sem dados ainda'}
              </p>
            </div>
          </div>

          {/* Recomendação */}
          <div className="mt-6 max-[479px]:mt-4 p-4 max-[479px]:p-3 rounded-xl bg-gradient-to-r from-neon-blue/5 to-neon-purple/5 border border-card-border">
            <p className="text-sm max-[479px]:text-xs text-text-secondary">
              <span className="text-neon-blue font-medium">💡 Recomendação:</span>{' '}
              {subjects.length === 0
                ? 'Sem recomendações ainda. Inicie seus estudos para gerar insights.'
                : intelligentSummary.weakestSubject
                ? `Priorize ${intelligentSummary.weakestSubject.name} nos próximos dias. Previsão de evolução em 30 dias: ${intelligentSummary.projectedImprovement30d > 0 ? '+' : ''}${intelligentSummary.projectedImprovement30d.toFixed(1)} pontos percentuais.`
                : 'Continue registrando sessões para gerar recomendações adaptativas.'}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 max-[479px]:gap-2 sm:gap-4">
            <div className="p-4 max-[479px]:p-3 rounded-xl bg-white/5 border border-card-border">
              <p className="text-xs text-text-secondary">Consistência (30 dias)</p>
              <p className="text-xl font-heading font-bold text-white mt-1">
                {Math.round((intelligentSummary.consistencyRate || 0) * 100)}%
              </p>
            </div>
            <div className="p-4 max-[479px]:p-3 rounded-xl bg-white/5 border border-card-border">
              <p className="text-xs text-text-secondary">Previsão de Evolução</p>
              <p className="text-xl font-heading font-bold text-white mt-1">
                {intelligentSummary.projectedImprovement30d > 0 ? '+' : ''}
                {intelligentSummary.projectedImprovement30d.toFixed(1)} pp / 30d
              </p>
            </div>
            <div className="p-4 max-[479px]:p-3 rounded-xl bg-white/5 border border-card-border">
              <p className="text-xs text-text-secondary">Produtividade Média</p>
              <p className="text-xl font-heading font-bold text-white mt-1">
                {avgProductivity}%
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
