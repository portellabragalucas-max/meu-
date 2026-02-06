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
import { WelcomeModal, EmptyDashboard, TutorialTooltip, dashboardTutorialSteps } from '@/components/onboarding';
import { useOnboarding, useLocalStorage } from '@/hooks';
import { isSameDay, formatDate, getWeekStart, getWeekDates } from '@/lib/utils';
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
      const hours = analytics.daily[dateKey]?.hours ?? 0;
      const dayIndex = date.getDay();
      return {
        day: dayLabels[dayIndex],
        hours: Number(hours.toFixed(1)),
        target: activeDays.includes(dayIndex) ? Number(perDayGoal.toFixed(1)) : 0,
      };
    });
  }, [analytics, studyPrefs, weeklyGoal]);

  const weeklyHours = weeklyData.reduce((sum, d) => sum + d.hours, 0);
  const focusScore = 0;

  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const hours = analytics.daily[key]?.hours ?? 0;
      if (hours > 0) {
        count += 1;
      } else {
        break;
      }
    }
    return count;
  }, [analytics]);

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

  const todayPlan = useMemo(() => {
    const today = new Date();
    const normalizedBlocks = plannerBlocks
      .map((block) => ({
        ...block,
        date: new Date(block.date),
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const blocksForToday = normalizedBlocks.filter((block) =>
      isSameDay(new Date(block.date), today)
    );

    if (blocksForToday.length > 0) {
      return { blocks: blocksForToday, date: today, source: 'today' as const };
    }

    // Fallback: show next available day blocks if none scheduled today
    const nextBlock = normalizedBlocks.find((block) => block.date >= today);
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

    const effectiveMinutes = minutesSpent && minutesSpent > 0 ? minutesSpent : targetBlock.durationMinutes;
    const hours = effectiveMinutes / 60;

    setPlannerBlocks((blocks) =>
      blocks.map((b) =>
        b.id === blockId ? { ...b, status: 'completed' as const } : b
      )
    );

    if (!targetBlock.isBreak && targetBlock.subjectId) {
      setSubjects((prev) =>
        prev.map((subject) =>
          subject.id === targetBlock.subjectId
            ? {
                ...subject,
                completedHours: Number((subject.completedHours + hours).toFixed(1)),
                totalHours: Number((subject.totalHours + hours).toFixed(1)),
                sessionsCount: subject.sessionsCount + 1,
              }
            : subject
        )
      );
    }

    if (!targetBlock.isBreak) {
      const dateKey = new Date(targetBlock.date).toISOString().split('T')[0];
      setAnalytics((prev) => {
        const current = prev.daily[dateKey] || { hours: 0, sessions: 0 };
        return {
          ...prev,
          daily: {
            ...prev.daily,
            [dateKey]: {
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonChart />
          </div>
          <SkeletonCard className="h-[400px]" />
        </div>

        {/* Plan skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        steps={dashboardTutorialSteps}
        isActive={shouldShowTutorial}
        onComplete={completeTutorial}
        onSkip={skipTutorial}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Cabeçalho da página */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-white">
              Olá, {userSettings.name || 'Estudante'}! 👋
            </h1>
            <p className="text-text-secondary mt-1">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <motion.div
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="glass-card p-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-neon-blue/20 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-neon-blue" />
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
                className="glass-card p-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-neon-purple/20 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-neon-purple" />
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
                className="glass-card p-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-neon-cyan/20 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-neon-cyan" />
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
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
              data-tutorial="stats"
            >
              <StatsCard
                title="Horas Semanais"
                titleShort="Horas"
                value={`${weeklyHours.toFixed(1)}h`}
                subtitle={`de ${weeklyGoal.toFixed(1)}h de meta`}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Plano do dia - 2 colunas */}
              <motion.div
                variants={itemVariants}
                className="lg:col-span-2"
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
                  <h2 className="text-xl font-heading font-bold text-white mb-4">
                    Progresso das Disciplinas
                  </h2>
                  <p className="text-sm text-text-secondary mb-6">
                    Metas semanais
                  </p>

                  <div className="space-y-5">
                    {subjects.map((subject, index) => (
                      <motion.div
                        key={subject.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: subject.color }}
                            />
                            <span className="text-sm font-medium text-white">
                              {subject.name}
                            </span>
                          </div>
                          <span className="text-xs text-text-secondary">
                            {subject.completedHours}h / {subject.targetHours}h
                          </span>
                        </div>
                        <div className="relative">
                          <ProgressBar
                            value={subject.completedHours}
                            max={subject.targetHours}
                            color={
                              subject.completedHours >= subject.targetHours
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
                  <div className="mt-6 pt-4 border-t border-card-border">
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







