'use client';

/**
 * Smart Planner Page
 * Agenda semanal com IA e arrastar e soltar
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Map as MapIcon, X } from 'lucide-react';
import { WeeklyPlanner } from '@/components/planner';
import { generateChronologicalSchedule, getPhaseForDate } from '@/services/roadmapEngine';
import { buildSubjectPerformanceProfiles, inferUserLearningLevel } from '@/services/adaptiveStudyIntelligence';
import { useLocalStorage } from '@/hooks';
import { cn, getWeekStart, timeToMinutes, minutesToTime } from '@/lib/utils';
import { getStudyBlockTypeLabel } from '@/lib/studyBlockLabels';
import { isEnemGoal, upgradeSubjectsToOfficialEnemStructure } from '@/lib/enemCatalog';
import type {
  AnalyticsStore,
  StudyBlock,
  Subject,
  StudyPreferences,
  UserSettings,
  WeekdayKey,
} from '@/types';
import { defaultSettings } from '@/lib/defaultSettings';

// Blocos iniciais vazios
const initialBlocks: StudyBlock[] = [];
const weekDayKeys: WeekdayKey[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const emptyAnalytics: AnalyticsStore = { daily: {} };

const toLocalKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const parseLocalKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getHoursForDate = (
  date: Date,
  dailyHoursByWeekday: UserSettings['dailyHoursByWeekday'],
  fallbackHours: number
) => {
  if (!dailyHoursByWeekday) return fallbackHours;
  const key = weekDayKeys[date.getDay()];
  const value = dailyHoursByWeekday[key];
  return typeof value === 'number' ? value : fallbackHours;
};

const buildDailyLimitByDate = (
  startDate: Date,
  endDate: Date,
  dailyHoursByWeekday: UserSettings['dailyHoursByWeekday'],
  fallbackHours: number
) => {
  const limits: Record<string, number> = {};
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const hours = getHoursForDate(cursor, dailyHoursByWeekday, fallbackHours);
    limits[toLocalKey(cursor)] = Math.max(0, Math.round(hours * 60));
    cursor.setDate(cursor.getDate() + 1);
  }
  return limits;
};

const buildDailyTimeWindowByDate = (
  startDate: Date,
  endDate: Date,
  dailyAvailabilityByWeekday: UserSettings['dailyAvailabilityByWeekday']
) => {
  const windows: Record<string, { start: string; end: string }> = {};
  if (!dailyAvailabilityByWeekday) return windows;
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const key = weekDayKeys[cursor.getDay()];
    const dayWindow = dailyAvailabilityByWeekday[key];
    if (
      dayWindow?.start &&
      dayWindow?.end &&
      timeToMinutes(dayWindow.end) > timeToMinutes(dayWindow.start)
    ) {
      windows[toLocalKey(cursor)] = { start: dayWindow.start, end: dayWindow.end };
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return windows;
};

export default function PlannerPage() {
  const [subjects, setSubjects] = useLocalStorage<Subject[]>('nexora_subjects', []);
  const [studyPrefs] = useLocalStorage<StudyPreferences>('nexora_study_prefs', {
    hoursPerDay: 2,
    daysOfWeek: [1, 2, 3, 4, 5],
    mode: 'random',
    examDate: '',
  });
  const [blocks, setBlocks] = useLocalStorage<StudyBlock[]>(
    'nexora_planner_blocks',
    initialBlocks
  );
  const [scheduleRange, setScheduleRange] = useLocalStorage<{ startDate: string; endDate: string } | null>(
    'nexora_schedule_range',
    null
  );
  const [userSettings] = useLocalStorage<UserSettings>('nexora_user_settings', defaultSettings);
  const [isMobile, setIsMobile] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(true);
  const [dailyLimits] = useLocalStorage<Record<string, number>>('nexora_daily_limits', {});
  const [analytics] = useLocalStorage<AnalyticsStore>('nexora_analytics', emptyAnalytics);
  const [isGenerating, setIsGenerating] = useState(false);
  const [firstCycleAllSubjects, setFirstCycleAllSubjects] = useLocalStorage<boolean>(
    'nexora_first_cycle_all_subjects',
    true
  );
  const scheduleStartDate = useMemo(
    () => (scheduleRange?.startDate ? parseLocalKey(scheduleRange.startDate) : null),
    [scheduleRange?.startDate]
  );
  const scheduleEndDate = useMemo(
    () => (scheduleRange?.endDate ? parseLocalKey(scheduleRange.endDate) : null),
    [scheduleRange?.endDate]
  );

  useEffect(() => {
    if (!isEnemGoal(studyPrefs.goal)) return;
    if (subjects.length === 0) return;

    const upgraded = upgradeSubjectsToOfficialEnemStructure(subjects);
    const changed =
      upgraded.length !== subjects.length ||
      upgraded.some((subject, index) => {
        const current = subjects[index];
        if (!current) return true;
        return (
          subject.id !== current.id ||
          subject.name !== current.name ||
          subject.area !== current.area ||
          subject.pesoNoExame !== current.pesoNoExame ||
          subject.icon !== current.icon
        );
      });

    if (changed) {
      setSubjects(upgraded);
    }
  }, [studyPrefs.goal, subjects, setSubjects]);

  const activeDaysFromSettings = useMemo(() => {
    if (userSettings.dailyHoursByWeekday) {
      return weekDayKeys
        .map((key, index) => ({ key, index }))
        .filter((entry) => (userSettings.dailyHoursByWeekday?.[entry.key] ?? 0) > 0)
        .map((entry) => entry.index);
    }
    return studyPrefs.daysOfWeek ?? [];
  }, [studyPrefs.daysOfWeek, userSettings.dailyHoursByWeekday]);

  const averageDailyHours = userSettings.dailyHoursByWeekday
    ? (() => {
        const values = Object.values(userSettings.dailyHoursByWeekday).filter((value) => value > 0);
        if (values.length === 0) return studyPrefs.hoursPerDay;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      })()
    : studyPrefs.hoursPerDay;

  const aiProfile = useMemo(() => {
    const baseBlock =
      studyPrefs.focusBlockMinutes || studyPrefs.blockDurationMinutes || userSettings.maxBlockMinutes || 90;
    const baseBreak = studyPrefs.breakDurationMinutes || userSettings.breakMinutes || 15;
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const lockBlockAndBreak =
      (typeof studyPrefs.focusBlockMinutes === 'number' ||
        typeof studyPrefs.blockDurationMinutes === 'number') &&
      typeof studyPrefs.breakDurationMinutes === 'number';

    let difficulty = userSettings.aiDifficulty;
    if (difficulty === 'adaptive') {
      const today = new Date();
      let totalHours = 0;
      for (let i = 6; i >= 0; i -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const key = date.toISOString().split('T')[0];
        totalHours += analytics.daily[key]?.hours ?? 0;
      }
      const activeCount = activeDaysFromSettings.length || 7;
      const weeklyGoal = Math.max(0.5, averageDailyHours) * activeCount;
      const ratio = weeklyGoal > 0 ? totalHours / weeklyGoal : 0;
      if (ratio < 0.4) difficulty = 'easy';
      else if (ratio > 0.8) difficulty = 'hard';
      else difficulty = 'medium';
    }

    let blockMinutes = baseBlock;
    let breakMinutes = baseBreak;

    if (lockBlockAndBreak) {
      return {
        blockMinutes: clamp(baseBlock, 25, 150),
        breakMinutes: clamp(baseBreak, 5, 25),
        difficulty,
      };
    }

    if (difficulty === 'easy') {
      blockMinutes = clamp(baseBlock * 0.8, 25, 60);
      breakMinutes = clamp(baseBreak * 1.3, 10, 25);
    } else if (difficulty === 'hard') {
      blockMinutes = clamp(baseBlock * 1.2, 45, 150);
      breakMinutes = clamp(baseBreak * 0.7, 5, 15);
    } else {
      blockMinutes = clamp(baseBlock, 25, 120);
      breakMinutes = clamp(baseBreak, 5, 20);
    }

    if (userSettings.focusMode) {
      blockMinutes = clamp(blockMinutes + 10, 25, 150);
      breakMinutes = clamp(breakMinutes - 2, 5, 20);
    }

    if (userSettings.smartBreaks) {
      breakMinutes = blockMinutes >= 90 ? 15 : blockMinutes >= 60 ? 10 : 5;
    }

    return { blockMinutes, breakMinutes, difficulty };
  }, [
    analytics.daily,
    averageDailyHours,
    activeDaysFromSettings.length,
    studyPrefs.focusBlockMinutes,
    studyPrefs.blockDurationMinutes,
    studyPrefs.breakDurationMinutes,
    userSettings.aiDifficulty,
    userSettings.breakMinutes,
    userSettings.focusMode,
    userSettings.maxBlockMinutes,
    userSettings.smartBreaks,
  ]);

  const phaseInfo = getPhaseForDate(
    new Date(),
    scheduleStartDate ?? getWeekStart(new Date())
  );
  const inferredUserLevel = useMemo(
    () => inferUserLearningLevel(studyPrefs, subjects, analytics),
    [studyPrefs, subjects, analytics]
  );
  const performanceProfilesBySubject = useMemo(
    () => buildSubjectPerformanceProfiles(subjects, analytics, new Date()),
    [subjects, analytics]
  );
  const aiModeLabel = useMemo(() => {
    const map = { easy: 'Leve', medium: 'Moderado', hard: 'Intenso', adaptive: 'Adaptativo' };
    const resolved = map[aiProfile.difficulty as keyof typeof map] || 'Moderado';
    if (userSettings.aiDifficulty === 'adaptive') {
      return `Adaptativo (${resolved})`;
    }
    return resolved;
  }, [aiProfile.difficulty, userSettings.aiDifficulty]);

  useEffect(() => {
    // O backlog/reagendamento automático agora é tratado no WeeklyPlanner
    // (com quota diária e priorização). Mantemos este efeito desabilitado
    // para evitar conflito com o fluxo legado que movia tudo para o dia seguinte.
  }, []);
 
  useEffect(() => {
    if (subjects.length === 0 && blocks.length > 0) {
      setBlocks([]);
      return;
    }

    if (subjects.length === 0) return;

    const simuladoSubject: Subject = {
      id: 'simulado',
      userId: 'user1',
      name: 'Simulado',
      color: '#FF7A00',
      icon: 'target',
      priority: 5,
      difficulty: 6,
      targetHours: 0,
      completedHours: 0,
      totalHours: 0,
      sessionsCount: 0,
      averageScore: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const subjectsById = new Map(subjects.map((s) => [s.id, s]));
    subjectsById.set(simuladoSubject.id, simuladoSubject);
    setBlocks((prev) => {
      const next = prev
        .filter((block) => block.isBreak || subjectsById.has(block.subjectId))
        .map((block) =>
          block.isBreak
            ? block
            : {
                ...block,
                subject: subjectsById.get(block.subjectId) ?? simuladoSubject,
              }
        );

      if (next.length !== prev.length) return next;

      for (let i = 0; i < next.length; i++) {
        const a = prev[i];
        const b = next[i];
        if (
          a.id !== b.id ||
          a.status !== b.status ||
          a.subjectId !== b.subjectId ||
          a.startTime !== b.startTime ||
          a.endTime !== b.endTime ||
          a.subject?.id !== b.subject?.id
        ) {
          return next;
        }
      }

      return prev;
    });
  }, [subjects, blocks.length, setBlocks]);

  const handleBlocksChange = (newBlocks: StudyBlock[]) => {
    setBlocks(newBlocks);
    // Em produção, salvaria no banco de dados
  };

  const handleGenerateSchedule = useCallback(async (range?: { startDate: Date; endDate: Date }) => {
    if (subjects.length === 0) {
      alert('Adicione disciplinas antes de gerar a agenda.');
      return;
    }
    if (!userSettings.autoSchedule) {
      alert('Agendamento automatico desativado. Ative nas configuracoes de IA para gerar o cronograma.');
      return;
    }
    setIsGenerating(true);

    // Simular delay da API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Gerar agenda usando o algoritmo
    const activeDays = userSettings.dailyHoursByWeekday
      ? weekDayKeys
          .map((key, index) => ({ key, index }))
          .filter((entry) => (userSettings.dailyHoursByWeekday?.[entry.key] ?? 0) > 0)
          .map((entry) => entry.index)
      : studyPrefs.daysOfWeek ?? [];
    const excludeDays =
      activeDays.length > 0
        ? [0, 1, 2, 3, 4, 5, 6].filter((day) => !activeDays.includes(day))
        : [0];

    const startDate = new Date(
      (range?.startDate ?? scheduleStartDate ?? getWeekStart(new Date())).getTime()
    );
    startDate.setHours(0, 0, 0, 0);

    let endDate = range?.endDate ? new Date(range.endDate.getTime()) : null;
    if (!endDate && scheduleEndDate) {
      endDate = new Date(scheduleEndDate.getTime());
    }
    if (!endDate) {
      endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    }
    endDate.setHours(0, 0, 0, 0);

    if (endDate < startDate) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
    }

    const baseLimits = buildDailyLimitByDate(
      startDate,
      endDate,
      userSettings.dailyHoursByWeekday,
      studyPrefs.hoursPerDay
    );
    const mergedLimits = { ...baseLimits, ...dailyLimits };
    const dailyTimeWindowByDate = buildDailyTimeWindowByDate(
      startDate,
      endDate,
      userSettings.dailyAvailabilityByWeekday
    );

    const schedule = generateChronologicalSchedule({
      subjects,
      preferences: {
        ...studyPrefs,
        userLevel: studyPrefs.userLevel || inferredUserLevel,
      },
      startDate,
      endDate,
      preferredStart: userSettings.preferredStart || '09:00',
      preferredEnd: userSettings.preferredEnd || minutesToTime(timeToMinutes('09:00') + 6 * 60),
      maxBlockMinutes: aiProfile.blockMinutes,
      breakMinutes: aiProfile.breakMinutes,
      restDays: userSettings.excludeDays || excludeDays,
      dailyLimitByDate: mergedLimits,
      dailyTimeWindowByDate,
      firstCycleAllSubjects,
      performanceMetricsBySubject: performanceProfilesBySubject,
      userLevel: inferredUserLevel,
      adaptiveNow: new Date(),
      enableScheduleCache: true,
      completedLessonsTotal: blocks.filter(
        (block) =>
          block.status === 'completed' &&
          !block.isBreak &&
          (block.type === 'AULA' || block.sessionType === 'teoria')
      ).length,
      completedLessonsBySubject: blocks.reduce<Record<string, number>>((acc, block) => {
        if (
          block.status === 'completed' &&
          !block.isBreak &&
          (block.type === 'AULA' || block.sessionType === 'teoria')
        ) {
          acc[block.subjectId] = (acc[block.subjectId] || 0) + 1;
        }
        return acc;
      }, {}),
      completedPracticeTotal: blocks.filter(
        (block) =>
          block.status === 'completed' &&
          !block.isBreak &&
          (block.type === 'EXERCICIOS' || block.sessionType === 'pratica')
      ).length,
      completedPracticeBySubject: blocks.reduce<Record<string, number>>((acc, block) => {
        if (
          block.status === 'completed' &&
          !block.isBreak &&
          (block.type === 'EXERCICIOS' || block.sessionType === 'pratica')
        ) {
          acc[block.subjectId] = (acc[block.subjectId] || 0) + 1;
        }
        return acc;
      }, {}),
      simuladoRules: (() => {
        const examDate = studyPrefs.examDate ? new Date(studyPrefs.examDate) : null;
        const daysToExam =
          examDate && !Number.isNaN(examDate.getTime())
            ? Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
        const adaptiveFrequencyDays = daysToExam !== null && daysToExam <= 90 ? 7 : 14;
        const intensity = studyPrefs.intensity || 'normal';
        const frequencyDays =
          intensity === 'intensa'
            ? Math.max(5, adaptiveFrequencyDays - 3)
            : intensity === 'leve'
            ? adaptiveFrequencyDays + 7
            : adaptiveFrequencyDays;
        const lessonDelta = intensity === 'intensa' ? -2 : intensity === 'leve' ? 2 : 0;
        const practiceDelta = intensity === 'intensa' ? -1 : intensity === 'leve' ? 2 : 0;
        if (studyPrefs.goal === 'medicina') {
          return {
            minLessonsBeforeSimulated: Math.max(8, 20 + lessonDelta),
            minPracticeBeforeSimulated: Math.max(4, 12 + practiceDelta),
            minLessonsPerSubject: 3,
            minDaysBeforeSimulated: 14,
            frequencyDays,
            minLessonsBeforeAreaSimulated: 8,
            minDaysBeforeAreaSimulated: 7,
          };
        }
        if (studyPrefs.goal === 'concurso') {
          return {
            minLessonsBeforeSimulated: Math.max(8, 16 + lessonDelta),
            minPracticeBeforeSimulated: Math.max(4, 10 + practiceDelta),
            minLessonsPerSubject: 2,
            minDaysBeforeSimulated: 14,
            frequencyDays,
            minLessonsBeforeAreaSimulated: 6,
            minDaysBeforeAreaSimulated: 7,
          };
        }
        if (studyPrefs.goal === 'enem') {
          return {
            minLessonsBeforeSimulated: Math.max(8, 20 + lessonDelta),
            minPracticeBeforeSimulated: Math.max(4, 12 + practiceDelta),
            minLessonsPerSubject: 2,
            minDaysBeforeSimulated: 14,
            frequencyDays,
            minLessonsBeforeAreaSimulated: 8,
            minDaysBeforeAreaSimulated: 7,
          };
        }
        return {
          minLessonsBeforeSimulated: Math.max(8, 20 + lessonDelta),
          minPracticeBeforeSimulated: Math.max(4, 8 + practiceDelta),
          minLessonsPerSubject: 2,
          minDaysBeforeSimulated: 14,
          frequencyDays,
          minLessonsBeforeAreaSimulated: 6,
          minDaysBeforeAreaSimulated: 7,
        };
      })(),
      debug: false,
    });

    setBlocks((prev) => {
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(23, 59, 59, 999);

      const remaining = prev.filter((block) => {
        const blockDate = new Date(block.date);
        return blockDate < rangeStart || blockDate > rangeEnd;
      });

      const merged = [...remaining, ...schedule.blocks];
      merged.sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.startTime.localeCompare(b.startTime);
      });
      return merged;
    });
    setScheduleRange({
      startDate: toLocalKey(startDate),
      endDate: toLocalKey(endDate),
    });
    setIsGenerating(false);
  }, [
    subjects,
    userSettings.autoSchedule,
    userSettings.dailyHoursByWeekday,
    userSettings.dailyAvailabilityByWeekday,
    userSettings.preferredStart,
    userSettings.preferredEnd,
    userSettings.excludeDays,
    studyPrefs,
    aiProfile.blockMinutes,
    aiProfile.breakMinutes,
    dailyLimits,
    blocks,
    firstCycleAllSubjects,
    inferredUserLevel,
    performanceProfilesBySubject,
    scheduleStartDate,
    scheduleEndDate,
    setBlocks,
    setScheduleRange,
  ]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setShowRoadmap(!isMobile);
  }, [isMobile]);



  const roadmapSummary = useMemo(() => {
    return subjects.map((subject) => {
      const subjectBlocks = blocks
        .filter((block) => !block.isBreak && block.subjectId === subject.id)
        .sort((a, b) => {
          const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return a.startTime.localeCompare(b.startTime);
        });
      const counts = subjectBlocks.reduce(
        (acc, block) => {
          if (block.type) acc[block.type] = (acc[block.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      const nextBlock = subjectBlocks.find((block) => block.status !== 'completed');
      return { subject, counts, nextBlock };
    });
  }, [blocks, subjects]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="app-page w-full min-h-0 min-w-0 max-w-[980px] mx-auto overflow-x-hidden pb-[calc(var(--bottom-nav-safe-height)+1.25rem)] md:pb-3"
    >
      {isMobile && !showRoadmap && (
        <button
          className="flex min-w-0 items-center gap-2 rounded-full border border-neon-cyan/30 bg-slate-900/60 px-3 py-2 text-xs text-neon-cyan shadow-sm"
          onClick={() => setShowRoadmap(true)}
          aria-label="Abrir trilha de aprovação"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neon-cyan/15 text-neon-cyan">
            <MapIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 truncate">Base (Fundamentos)</span>
        </button>
      )}

      {(!isMobile || showRoadmap) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-[#161922]/95 p-3 shadow-lg sm:border-neon-cyan/20 sm:bg-slate-900/60 sm:p-4"
        >
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs text-text-secondary">Trilha de Aprovacao</p>
                <h3 className="break-words text-lg font-semibold text-white">{phaseInfo.label}</h3>
                <p className="text-xs text-text-muted">
                  Alternancia inteligente de areas + revisao espacada para melhor retencao.
                </p>
                <p className="text-xs text-text-secondary mt-2">
                  IA: <span className="text-white font-medium">{aiModeLabel}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-xs">
                  Roadmap ativo
                </div>
                {isMobile && (
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text-secondary"
                    onClick={() => setShowRoadmap(false)}
                    aria-label="Minimizar trilha de aprovação"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

          <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/5 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs text-text-secondary">Primeiro ciclo completo</p>
              <p className="text-sm text-text-muted">
                Garante 1 aula de cada materia antes de repetir.
              </p>
            </div>
            <button
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                firstCycleAllSubjects ? 'bg-neon-cyan' : 'bg-white/10'
              )}
              onClick={() => setFirstCycleAllSubjects((prev) => !prev)}
              aria-label="Alternar primeiro ciclo completo"
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  firstCycleAllSubjects ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            {roadmapSummary.map((item) => (
              <div
                key={item.subject.id}
                className="rounded-xl border border-white/5 bg-slate-900/50 p-3"
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-flex h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.subject.color }}
                    />
                    <p className="truncate text-sm font-medium text-white">{item.subject.name}</p>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">
                    Proximo: {getStudyBlockTypeLabel(item.nextBlock?.type, item.nextBlock?.sessionType) ?? 'Aula'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-secondary">
                  <span>Aula {item.counts.AULA ?? 0}</span>
                  <span>Exercicios {item.counts.EXERCICIOS ?? 0}</span>
                  <span>Revisao {item.counts.REVISAO ?? 0}</span>
                  <span>Simulado {(item.counts.SIMULADO_AREA ?? 0) + (item.counts.SIMULADO_COMPLETO ?? 0)}</span>
                </div>
                {item.nextBlock?.date && (
                  <p className="mt-1 text-[11px] text-text-muted">
                    {new Date(item.nextBlock.date).toLocaleDateString('pt-BR')} - {item.nextBlock.startTime}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        </motion.div>
      )}

      <WeeklyPlanner
        initialBlocks={blocks}
        onBlocksChange={handleBlocksChange}
        onGenerateSchedule={handleGenerateSchedule}
        isGenerating={isGenerating}
        subjects={subjects}
        defaultDailyLimitMinutes={Math.round(averageDailyHours * 60)}
        dailyHoursByWeekday={userSettings.dailyHoursByWeekday}
        allowedDays={activeDaysFromSettings}
        selectedScheduleStartDate={scheduleRange?.startDate ?? null}
        selectedScheduleEndDate={scheduleRange?.endDate ?? null}
      />
    </motion.div>
  );
}
