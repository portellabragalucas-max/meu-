'use client';

/**
 * Dashboard Page
 * Visão geral com estatísticas, progresso semanal e plano do dia
 * Inclui experiência de primeiro uso (FTUE)
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Clock,
  Target,
  Flame,
  Brain,
  TrendingUp,
  Calendar,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { StatsCard, Card, ProgressBar, SkeletonCard, SkeletonChart, SkeletonPlan } from '@/components/ui';
import { TodayPlan, WeeklyChart, LevelProgress } from '@/components/dashboard';
import {
  WelcomeModal,
  EmptyDashboard,
  TutorialTooltip,
  dashboardTutorialSteps,
  dashboardEmptyTutorialSteps,
} from '@/components/onboarding';
import { useOnboarding, useLocalStorage } from '@/hooks';
import { isSameDay, formatDate, formatHoursDuration, getWeekStart, getWeekDates } from '@/lib/utils';
import { applyBlockCompletionMetrics } from '@/services/adaptiveStudyIntelligence';
import type { StudyBlock, Subject, AnalyticsStore, StudyPreferences, UserSettings } from '@/types';
import { StudyBlockSessionModal } from '@/components/session';
import { defaultSettings } from '@/lib/defaultSettings';

const emptyAnalytics: AnalyticsStore = { daily: {} };
const defaultStudyPrefs: StudyPreferences = {
  hoursPerDay: 2,
  daysOfWeek: [1, 2, 3, 4, 5],
  mode: 'random',
  examDate: '',
};

// Variantes de animação
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const hasManualSequence = (block: StudyBlock) =>
  typeof block.sequenceIndex === 'number' && Number.isFinite(block.sequenceIndex);

const compareBlocksWithinDay = (a: StudyBlock, b: StudyBlock) => {
  const aHasSequence = hasManualSequence(a);
  const bHasSequence = hasManualSequence(b);

  if (aHasSequence && bHasSequence) {
    const sequenceDiff = (a.sequenceIndex as number) - (b.sequenceIndex as number);
    if (sequenceDiff !== 0) return sequenceDiff;
  } else if (aHasSequence !== bHasSequence) {
    return aHasSequence ? -1 : 1;
  }

  return a.startTime.localeCompare(b.startTime);
};

const comparePlannerBlocks = (a: StudyBlock, b: StudyBlock) => {
  const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
  if (dateDiff !== 0) return dateDiff;
  return compareBlocksWithinDay(a, b);
};

export default function DashboardPage() {
  const router = useRouter();
  const {
    isLoading: onboardingLoading,
    shouldShowWelcome,
    shouldShowTutorial,
    completeWelcome,
    completeTutorial,
    skipTutorial,
  } = useOnboarding();

  const [plannerBlocks, setPlannerBlocks] = useLocalStorage<StudyBlock[]>('nexora_planner_blocks', []);
  const [subjects, setSubjects] = useLocalStorage<Subject[]>('nexora_subjects', []);
  const [analytics, setAnalytics] = useLocalStorage<AnalyticsStore>('nexora_analytics', emptyAnalytics);
  const [studyPrefs] = useLocalStorage<StudyPreferences>('nexora_study_prefs', defaultStudyPrefs);
  const [userSettings] = useLocalStorage<UserSettings>('nexora_user_settings', defaultSettings);
  const [sessionBlock, setSessionBlock] = useState<StudyBlock | null>(null);
  const [isSessionOpen, setIsSessionOpen] = useState(false);

  // useLocalStorage já hidrata na montagem; evitar loops de re-hidratação

  const weeklyGoal = useMemo(() => {
    const subjectsGoal = subjects.reduce((sum, s) => sum + (s.targetHours || 0), 0);
    const activeDaysCount = studyPrefs.daysOfWeek?.length ?? 0;
    const prefsGoal = (studyPrefs.hoursPerDay || 0) * activeDaysCount;
    return subjectsGoal > 0 ? subjectsGoal : prefsGoal;
  }, [subjects, studyPrefs]);

  const completedHoursByDate = useMemo(() => {
    const totals: Record<string, number> = {};
    plannerBlocks.forEach((block) => {
      if (block.isBreak || block.status !== 'completed') return;
      const key = new Date(block.date).toISOString().split('T')[0];
      totals[key] = (totals[key] ?? 0) + block.durationMinutes / 60;
    });
    return totals;
  }, [plannerBlocks]);

  const weeklyData = useMemo(() => {
    const weekStart = getWeekStart(new Date());
    const weekDates = getWeekDates(weekStart);
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const configuredDays = studyPrefs.daysOfWeek ?? [];
    const activeDays =
      configuredDays.length > 0
        ? configuredDays
        : weeklyGoal > 0
          ? [0, 1, 2, 3, 4, 5, 6]
          : [];
    const perDayGoal = activeDays.length > 0 ? weeklyGoal / activeDays.length : 0;

    return weekDates.map((date) => {
      const dateKey = date.toISOString().split('T')[0];
      const analyticsHours = analytics.daily[dateKey]?.hours ?? 0;
      const blocksHours = completedHoursByDate[dateKey] ?? 0;
      const hours = Math.max(analyticsHours, blocksHours);
      const dayIndex = date.getDay();
      return {
        day: dayLabels[dayIndex],
        hours: Number(hours.toFixed(1)),
        target: activeDays.includes(dayIndex) ? Number(perDayGoal.toFixed(1)) : 0,
      };
    });
  }, [analytics, completedHoursByDate, studyPrefs, weeklyGoal]);

  const weeklyHours = weeklyData.reduce((sum, d) => sum + d.hours, 0);
  const focusScore = 0;

  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const analyticsHours = analytics.daily[key]?.hours ?? 0;
      const blocksHours = completedHoursByDate[key] ?? 0;
      const hours = Math.max(analyticsHours, blocksHours);
      if (hours > 0) {
        count += 1;
      } else {
        break;
      }
    }
    return count;
  }, [analytics, completedHoursByDate]);

  const completedThisWeek = useMemo(() => {
    const weekStart = getWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return plannerBlocks.filter((block) => {
      const blockDate = new Date(block.date);
      return (
        block.status === 'completed' &&
        blockDate >= weekStart &&
        blockDate < weekEnd &&
        !block.isBreak
      );
    }).length;
  }, [plannerBlocks]);

  const weeklyCompletedHoursBySubject = useMemo(() => {
    const weekStart = getWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const totals = new Map<string, number>();

    plannerBlocks.forEach((block) => {
      if (block.isBreak || block.status !== 'completed' || !block.subjectId) return;
      const blockDate = new Date(block.date);
      if (blockDate < weekStart || blockDate >= weekEnd) return;

      const previous = totals.get(block.subjectId) ?? 0;
      totals.set(block.subjectId, previous + block.durationMinutes / 60);
    });

    return totals;
  }, [plannerBlocks]);

  const todayPlan = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const normalizedBlocks = plannerBlocks
      .map((block) => ({
        ...block,
        date: new Date(block.date),
      }))
      .sort(comparePlannerBlocks);

    const blocksForToday = normalizedBlocks.filter((block) =>
      isSameDay(new Date(block.date), today)
    );

    if (blocksForToday.length > 0) {
      return { blocks: blocksForToday, date: today, source: 'today' as const };
    }

    // Fallback: show next available day blocks if none scheduled today
    const nextBlock = normalizedBlocks.find((block) => block.date >= todayStart);
    if (nextBlock) {
      const nextDate = new Date(nextBlock.date);
      return {
        blocks: normalizedBlocks.filter((block) =>
          isSameDay(new Date(block.date), nextDate)
        ),
        date: nextDate,
        source: 'next' as const,
      };
    }

    if (normalizedBlocks.length > 0) {
      const lastDate = new Date(normalizedBlocks[normalizedBlocks.length - 1].date);
      return {
        blocks: normalizedBlocks.filter((block) =>
          isSameDay(new Date(block.date), lastDate)
        ),
        date: lastDate,
        source: 'latest' as const,
      };
    }

    return { blocks: [], date: today, source: 'none' as const };
  }, [plannerBlocks]);

  const todayBlocks = todayPlan.blocks;
  const subjectOrderByPlan = useMemo(() => {
    const order = new Map<string, number>();
    todayBlocks.forEach((block, index) => {
      if (block.isBreak || !block.subjectId) return;
      if (!order.has(block.subjectId)) {
        order.set(block.subjectId, index);
      }
    });
    return order;
  }, [todayBlocks]);

  const subjectProgressRows = useMemo(
    () =>
      subjects
        .map((subject) => ({
          subject,
          completedHours: Number((weeklyCompletedHoursBySubject.get(subject.id) ?? 0).toFixed(1)),
        }))
        .sort((a, b) => {
          const aOrder = subjectOrderByPlan.get(a.subject.id);
          const bOrder = subjectOrderByPlan.get(b.subject.id);

          if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
          if (aOrder !== undefined) return -1;
          if (bOrder !== undefined) return 1;

          return a.subject.name.localeCompare(b.subject.name, 'pt-BR');
        }),
    [subjects, subjectOrderByPlan, weeklyCompletedHoursBySubject]
  );

  const planTitle =
    todayPlan.source === 'today' || todayPlan.source === 'none'
      ? 'Plano de Hoje'
      : `Plano de ${formatDate(todayPlan.date, 'short')}`;
  const planSubtitle =
    todayPlan.source === 'today' || todayPlan.source === 'none'
      ? undefined
      : 'Mostrando o dia planejado mais próximo';

  const handleStartSession = (blockId: string) => {
    setPlannerBlocks((blocks) =>
      blocks.map((b) =>
        b.id === blockId ? { ...b, status: 'in-progress' as const } : b
      )
    );
  };

  const handleSkipBlock = (blockId: string) => {
    setPlannerBlocks((blocks) =>
      blocks.map((b) =>
        b.id === blockId ? { ...b, status: 'skipped' as const } : b
      )
    );
  };

  const handleStartBlock = (block: StudyBlock) => {
    setSessionBlock(block);
    setIsSessionOpen(true);
  };

  const handleCompleteBlock = (blockId: string, minutesSpent?: number) => {
    const targetBlock = plannerBlocks.find((b) => b.id === blockId);
    if (!targetBlock) return;
    const targetSubject = subjects.find((s) => s.id === targetBlock.subjectId);

    const hasExplicitMinutes =
      typeof minutesSpent === 'number' && Number.isFinite(minutesSpent);
    const effectiveMinutes = hasExplicitMinutes
      ? Math.max(1, minutesSpent)
      : targetBlock.durationMinutes;
    const hours = effectiveMinutes / 60;

    setPlannerBlocks((blocks) =>
      blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              status: 'completed' as const,
              completedAt: new Date(),
              updatedAt: new Date(),
              durationMinutes: hasExplicitMinutes
                ? Math.max(1, Math.round(effectiveMinutes))
                : b.durationMinutes,
            }
          : b
      )
    );

    if (!targetBlock.isBreak && targetBlock.subjectId) {
      const metricsUpdate = targetSubject
        ? applyBlockCompletionMetrics({
            analytics,
            block: targetBlock,
            subject: targetSubject,
            minutesSpent: effectiveMinutes,
          })
        : null;

      setSubjects((prev) =>
        prev.map((subject) =>
          subject.id === targetBlock.subjectId
            ? {
                ...subject,
                completedHours: Number((subject.completedHours + hours).toFixed(1)),
                totalHours: Number((subject.totalHours + hours).toFixed(1)),
                sessionsCount: subject.sessionsCount + 1,
                averageScore:
                  metricsUpdate?.subjectRollingAccuracy !== undefined
                    ? Math.round(metricsUpdate.subjectRollingAccuracy * 100)
                    : subject.averageScore,
              }
            : subject
        )
      );
      if (metricsUpdate) {
        setAnalytics(metricsUpdate.analytics);
      }
    } else if (!targetBlock.isBreak) {
      // Fallback for cases where the subject was removed but the block still exists.
      const dateKey = new Date(targetBlock.date).toISOString().split('T')[0];
      setAnalytics((prev) => {
        const current = prev.daily[dateKey] || { hours: 0, sessions: 0 };
        return {
          ...prev,
          daily: {
            ...prev.daily,
            [dateKey]: {
              ...current,
              hours: Number((current.hours + hours).toFixed(2)),
              sessions: current.sessions + 1,
            },
          },
        };
      });
    }

    if (!targetBlock.isBreak) {
      const sameDayBreaks = plannerBlocks
        .filter(
          (block) =>
            block.isBreak &&
            block.status !== 'completed' &&
            isSameDay(new Date(block.date), new Date(targetBlock.date))
        )
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const nextBreak = sameDayBreaks.find(
        (block) => block.startTime >= targetBlock.endTime
      );

      if (nextBreak) {
        setTimeout(() => {
          setSessionBlock(nextBreak);
          setIsSessionOpen(true);
        }, 450);
      }
    }
  };

  const handleAddSubject = () => {
    router.push('/subjects');
  };

  // Estado de primeiro uso (sem disciplinas)
  const isEmptyState = subjects.length === 0;
  const tutorialSteps = isEmptyState ? dashboardEmptyTutorialSteps : dashboardTutorialSteps;

  // Loading state
  if (onboardingLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-card-bg rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-48 bg-card-bg rounded animate-pulse" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <SkeletonChart />
          </div>
          <SkeletonCard className="h-[400px]" />
        </div>

        {/* Plan skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <SkeletonPlan />
          </div>
          <SkeletonCard className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <StudyBlockSessionModal
        isOpen={isSessionOpen}
        block={sessionBlock}
        onClose={() => setIsSessionOpen(false)}
        onComplete={(blockId, minutesSpent) => {
          handleCompleteBlock(blockId, minutesSpent);
        }}
      />
      {/* Modal de Boas-vindas */}
      <WelcomeModal
        isOpen={shouldShowWelcome}
        onComplete={completeWelcome}
        userName={userSettings.name || 'Estudante'}
      />

      {/* Tutorial passo a passo */}
      <TutorialTooltip
        steps={tutorialSteps}
        isActive={shouldShowTutorial}
        onComplete={completeTutorial}
        onSkip={skipTutorial}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="app-page max-[479px]:[&>*+*]:mt-3"
      >
        {/* Cabeçalho da página */}
        <motion.div
          variants={itemVariants}
          className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          data-tutorial="dashboard-header"
        >
          <div className="min-w-0">
            <h1 className="text-2xl max-[479px]:text-xl sm:text-3xl font-heading font-bold text-white leading-tight">
              Olá, {userSettings.name || 'Estudante'}! 👋
            </h1>
            <p className="text-text-secondary mt-1 max-[479px]:text-sm">
              {isEmptyState
                ? 'Vamos configurar seu ambiente de estudos'
                : 'Aqui está seu resumo de estudos para hoje'}
            </p>
          </div>
          {!isEmptyState && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30"
            >
              <Sparkles className="w-5 h-5 text-neon-blue" />
              <span className="text-sm text-white">Agenda IA Ativa</span>
            </motion.div>
          )}
        </motion.div>

        {/* Estado vazio - Primeiro uso */}
        {isEmptyState ? (
          <motion.div variants={itemVariants}>
            <Card className="py-16">
              <EmptyDashboard onAddSubject={handleAddSubject} />
            </Card>

            {/* Cards de prévia */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-[479px]:gap-3 sm:gap-6 mt-6 max-[479px]:mt-4 sm:mt-8">
              <motion.div
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="glass-card p-4 max-[479px]:p-3 sm:p-6 text-center"
              >
                <div className="w-16 h-16 max-[479px]:w-12 max-[479px]:h-12 rounded-2xl bg-neon-blue/20 flex items-center justify-center mx-auto mb-4 max-[479px]:mb-3">
                  <BookOpen className="w-8 h-8 max-[479px]:w-6 max-[479px]:h-6 text-neon-blue" />
                </div>
                <h3 className="font-heading font-bold text-white mb-2">
                  Organize suas Disciplinas
                </h3>
                <p className="text-sm text-text-secondary">
                  Cadastre matérias com prioridade e dificuldade para otimizar seus estudos.
                </p>
              </motion.div>

              <motion.div
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="glass-card p-4 max-[479px]:p-3 sm:p-6 text-center"
              >
                <div className="w-16 h-16 max-[479px]:w-12 max-[479px]:h-12 rounded-2xl bg-neon-purple/20 flex items-center justify-center mx-auto mb-4 max-[479px]:mb-3">
                  <Calendar className="w-8 h-8 max-[479px]:w-6 max-[479px]:h-6 text-neon-purple" />
                </div>
                <h3 className="font-heading font-bold text-white mb-2">
                  Agenda Inteligente
                </h3>
                <p className="text-sm text-text-secondary">
                  A IA cria automaticamente um cronograma baseado nas suas necessidades.
                </p>
              </motion.div>

              <motion.div
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="glass-card p-4 max-[479px]:p-3 sm:p-6 text-center"
              >
                <div className="w-16 h-16 max-[479px]:w-12 max-[479px]:h-12 rounded-2xl bg-neon-cyan/20 flex items-center justify-center mx-auto mb-4 max-[479px]:mb-3">
                  <TrendingUp className="w-8 h-8 max-[479px]:w-6 max-[479px]:h-6 text-neon-cyan" />
                </div>
                <h3 className="font-heading font-bold text-white mb-2">
                  Acompanhe o Progresso
                </h3>
                <p className="text-sm text-text-secondary">
                  Visualize estatísticas e insights para melhorar continuamente.
                </p>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Cards de estatísticas */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-[479px]:gap-2"
              data-tutorial="stats"
            >
              <StatsCard
                title="Horas Semanais"
                titleShort="Horas"
                value={formatHoursDuration(weeklyHours)}
                subtitle={`de ${formatHoursDuration(weeklyGoal)} de meta`}
                icon={Clock}
                trend={{ value: 0, isPositive: false }}
                color="blue"
                variant="mobile"
              />
              <StatsCard
                title="Pontuação de Foco"
                titleShort="Foco"
                value={`${focusScore}%`}
                subtitle="Sem dados ainda"
                icon={Brain}
                trend={{ value: 0, isPositive: false }}
                color="purple"
                variant="mobile"
              />
              <StatsCard
                title="Sequência Atual"
                titleShort="Sequência"
                value={`${streak} dias`}
                subtitle="Recorde pessoal: 0 dias"
                icon={Flame}
                color="orange"
                variant="mobile"
              />
              <StatsCard
                title="Tarefas Concluídas"
                titleShort="Tarefas"
                value={completedThisWeek.toString()}
                subtitle="Esta semana"
                icon={Target}
                trend={{ value: 0, isPositive: false }}
                color="cyan"
                variant="mobile"
              />
            </motion.div>

            {/* Grid de conteúdo principal */}
            <div className="grid grid-cols-1 gap-4 max-[479px]:gap-3 sm:gap-6 lg:grid-cols-3">
              {/* Gráfico semanal - 2 colunas */}
              <motion.div
                variants={itemVariants}
                className="lg:col-span-2"
                data-tutorial="chart"
              >
                <WeeklyChart data={weeklyData} />
              </motion.div>

              {/* Progresso de nível */}
              <motion.div variants={itemVariants} data-tutorial="level">
                <LevelProgress
                  level={0}
                  currentXp={0}
                  xpForNextLevel={0}
                  totalXp={0}
                  achievements={0}
                />
              </motion.div>
            </div>

            {/* Seção inferior */}
            <div className="grid grid-cols-1 gap-4 max-[479px]:gap-3 sm:gap-6 lg:grid-cols-3">
              {/* Plano do dia - 2 colunas */}
              <motion.div
                variants={itemVariants}
                className="self-start lg:col-span-2"
                data-tutorial="plan"
              >
                <TodayPlan
                  blocks={todayBlocks}
                  onStartSession={handleStartSession}
                  onSkipBlock={handleSkipBlock}
                  title={planTitle}
                  subtitle={planSubtitle}
                  onCompleteBlock={handleCompleteBlock}
                  onStartBlock={handleStartBlock}
                />
              </motion.div>

              {/* Progresso das disciplinas */}
              <motion.div variants={itemVariants}>
                <Card className="h-full">
                  <h2 className="text-xl max-[479px]:text-lg font-heading font-bold text-white mb-4 max-[479px]:mb-2">
                    Progresso das Disciplinas
                  </h2>
                  <p className="text-sm max-[479px]:text-xs text-text-secondary mb-6 max-[479px]:mb-4">
                    Metas semanais
                  </p>

                  <div className="space-y-5 max-[479px]:space-y-3">
                    {subjectProgressRows.map(({ subject, completedHours }, index) => (
                      <motion.div
                        key={subject.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: subject.color }}
                            />
                            <span className="truncate text-sm font-medium text-white">
                              {subject.name}
                            </span>
                          </div>
                          <span className="shrink-0 text-xs text-text-secondary">
                            {formatHoursDuration(completedHours)} / {formatHoursDuration(subject.targetHours)}
                          </span>
                        </div>
                        <div className="relative">
                          <ProgressBar
                            value={completedHours}
                            max={subject.targetHours}
                            color={
                              completedHours >= subject.targetHours
                                ? 'cyan'
                                : 'blue'
                            }
                            size="sm"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Ações rápidas */}
                  <div className="mt-6 max-[479px]:mt-4 pt-4 max-[479px]:pt-3 border-t border-card-border">
                    <motion.a
                      href="/subjects"
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-2 text-sm text-neon-blue hover:text-neon-cyan transition-colors"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Ver todas as disciplinas
                    </motion.a>
                  </div>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}









