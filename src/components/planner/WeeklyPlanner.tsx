'use client';

/**
 * WeeklyPlanner Component
 * Grade principal do planner com funcionalidade de arrastar e soltar
 */

import { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, RefreshCw, ArrowRightLeft } from 'lucide-react';
import {
  getWeekStart,
  getWeekDates,
  formatDate,
  isSameDay,
  generateId,
  timeToMinutes,
  minutesToTime,
} from '@/lib/utils';
import { Button, Card } from '@/components/ui';
import { useLocalStorage } from '@/hooks';
import DayColumn from './DayColumn';
import TimeBlock from './TimeBlock';
import BlockFormModal, { type BlockFormData } from './BlockFormModal';
import { StudyBlockSessionModal } from '@/components/session';
import type { DailyHoursByWeekday, StudyBlock, Subject, WeekdayKey } from '@/types';

interface WeeklyPlannerProps {
  initialBlocks: StudyBlock[];
  onBlocksChange: (blocks: StudyBlock[]) => void;
  onGenerateSchedule: (range?: { startDate: Date; endDate: Date }) => void;
  isGenerating?: boolean;
  subjects?: Subject[];
  defaultDailyLimitMinutes?: number;
  defaultDailyLimitsByDate?: Record<string, number>;
  dailyHoursByWeekday?: DailyHoursByWeekday;
  allowedDays?: number[];
}

export default function WeeklyPlanner({
  initialBlocks,
  onBlocksChange,
  onGenerateSchedule,
  isGenerating = false,
  subjects = [],
  defaultDailyLimitMinutes = 0,
  defaultDailyLimitsByDate,
  dailyHoursByWeekday,
  allowedDays = [],
}: WeeklyPlannerProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart());
  const [blocks, setBlocks] = useState(initialBlocks);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDayIndex, setMobileDayIndex] = useState(0);

  // Sincronizar quando o pai atualizar os blocos (ex: após gerar agenda)
  useEffect(() => {
    setBlocks((prev) => {
      if (prev.length !== initialBlocks.length) return initialBlocks;
      for (let i = 0; i < prev.length; i++) {
        const a = prev[i];
        const b = initialBlocks[i];
        if (
          a.id !== b.id ||
          a.status !== b.status ||
          a.subjectId !== b.subjectId ||
          a.startTime !== b.startTime ||
          a.endTime !== b.endTime
        ) {
          return initialBlocks;
        }
      }
      return prev;
    });
  }, [initialBlocks]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [activeBlock, setActiveBlock] = useState<StudyBlock | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<StudyBlock | null>(null);
  const [blockModalDate, setBlockModalDate] = useState<Date>(new Date());
  const [blockModalDefaults, setBlockModalDefaults] = useState({
    startTime: '09:00',
    durationMinutes: 60,
  });
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleSourceDate, setRescheduleSourceDate] = useState('');
  const [rescheduleTargetDate, setRescheduleTargetDate] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [dailyLimits, setDailyLimits] = useLocalStorage<Record<string, number>>(
    'nexora_daily_limits',
    {}
  );
  const [sessionBlock, setSessionBlock] = useState<StudyBlock | null>(null);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const weekDayKeys: WeekdayKey[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const weekIndexFromDate = (date: Date) => (date.getDay() + 6) % 7;

  // Obter datas da semana
  const weekDates = useMemo(
    () => getWeekDates(currentWeekStart),
    [currentWeekStart]
  );
  useEffect(() => {
    if (!isMobile) return;
    const today = new Date();
    const todayIndex = weekDates.findIndex((date) => isSameDay(date, today));
    if (todayIndex >= 0) {
      setMobileDayIndex(todayIndex);
    }
  }, [isMobile, weekDates]);
  const formatDatePt = (date: Date) =>
    date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  const toLocalKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
  const parseLocalKey = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const isAllowedDay = (date: Date) =>
    allowedDays.length === 0 || allowedDays.includes(date.getDay());

  useEffect(() => {
    if (!isScheduleModalOpen) return;
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 6);
    setScheduleEndDate(toLocalKey(defaultEnd));
    setScheduleError('');
  }, [isScheduleModalOpen]);

  useEffect(() => {
    if (!isRescheduleModalOpen) return;
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const defaultSource = toLocalKey(today);
    const defaultTarget = toLocalKey(tomorrow);
    setRescheduleSourceDate(defaultSource);
    setRescheduleTargetDate(defaultTarget);
    setRescheduleError('');
  }, [isRescheduleModalOpen]);

  // Configurar sensores de arrastar
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Agrupar blocos por dia
  const blocksByDay = useMemo(() => {
    const grouped = new Map<string, StudyBlock[]>();
    
    weekDates.forEach((date) => {
      const dateKey = date.toISOString().split('T')[0];
      grouped.set(
        dateKey,
        blocks
          .filter((b) => isSameDay(new Date(b.date), date))
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
      );
    });
    
    return grouped;
  }, [blocks, weekDates]);

  const mobileDay = weekDates[mobileDayIndex] ?? weekDates[0];
  const mobileDayKey = mobileDay ? mobileDay.toISOString().split('T')[0] : '';
  const mobileDayBlocks = mobileDayKey ? blocksByDay.get(mobileDayKey) ?? [] : [];
  const mobileStudyMinutes = mobileDayBlocks
    .filter((block) => !block.isBreak)
    .reduce((sum, block) => sum + block.durationMinutes, 0);
  const mobileSessions = mobileDayBlocks.filter((block) => !block.isBreak).length;
  const visibleDates = isMobile ? [mobileDay] : weekDates;

  useEffect(() => {
    if (blocks.length === 0) return;
    const weekHasBlocks = blocks.some((block) =>
      weekDates.some((date) => isSameDay(new Date(block.date), date))
    );
    if (weekHasBlocks) return;

    const sortedBlocks = [...blocks].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.startTime.localeCompare(b.startTime);
    });
    const firstDate = new Date(sortedBlocks[0].date);
    const nextWeekStart = getWeekStart(firstDate);
    if (!isSameDay(nextWeekStart, currentWeekStart)) {
      setCurrentWeekStart(nextWeekStart);
    }
  }, [blocks, weekDates, currentWeekStart]);

  const getDailyLimitMinutes = (date: Date) => {
    const key = toLocalKey(date);
    const stored = dailyLimits[key];
    if (typeof stored === 'number') return stored;
    const fallback = defaultDailyLimitsByDate?.[key];
    if (typeof fallback === 'number') return fallback;
    if (dailyHoursByWeekday) {
      const dayKey = weekDayKeys[date.getDay()];
      const hours = dailyHoursByWeekday[dayKey];
      if (typeof hours === 'number') return Math.max(0, Math.round(hours * 60));
    }
    return defaultDailyLimitMinutes;
  };

  const moveBlocksToNextAllowedDay = (
    sourceDate: Date,
    blocksToMove: StudyBlock[]
  ) => {
    if (blocksToMove.length === 0) return;
    const DEFAULT_START = timeToMinutes('09:00');
    const DEFAULT_END = timeToMinutes('18:00');

    const baseBlocks = blocks.filter(
      (block) => !blocksToMove.some((moved) => moved.id === block.id)
    );

    const blocksMap = new Map<string, StudyBlock[]>();
    for (const block of baseBlocks) {
      const key = toLocalKey(new Date(block.date));
      const list = blocksMap.get(key) ?? [];
      list.push(block);
      blocksMap.set(key, list);
    }

    const sortedToMove = [...blocksToMove].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    let cursorDate = new Date(sourceDate);
    cursorDate.setDate(cursorDate.getDate() + 1);
    while (!isAllowedDay(cursorDate)) {
      cursorDate.setDate(cursorDate.getDate() + 1);
    }

    const movedBlocks: StudyBlock[] = [];

    for (const block of sortedToMove) {
      let placed = false;
      let guard = 0;
      while (!placed && guard < 31) {
        const key = toLocalKey(cursorDate);
        const dayBlocks = blocksMap.get(key) ?? [];
        const lastEnd = dayBlocks.reduce(
          (max, item) => Math.max(max, timeToMinutes(item.endTime)),
          DEFAULT_START
        );
        const startMinutes = Math.max(lastEnd, DEFAULT_START);
        const endMinutes = startMinutes + block.durationMinutes;

        if (endMinutes <= DEFAULT_END) {
          const moved: StudyBlock = {
            ...block,
            date: new Date(cursorDate),
            startTime: minutesToTime(startMinutes),
            endTime: minutesToTime(endMinutes),
            status: block.isBreak ? block.status : 'scheduled',
            updatedAt: new Date(),
          };
          movedBlocks.push(moved);
          dayBlocks.push(moved);
          blocksMap.set(key, dayBlocks);
          placed = true;
        } else {
          cursorDate.setDate(cursorDate.getDate() + 1);
          while (!isAllowedDay(cursorDate)) {
            cursorDate.setDate(cursorDate.getDate() + 1);
          }
        }
        guard += 1;
      }
    }

    const updatedBlocks = [...baseBlocks, ...movedBlocks].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    setBlocks(updatedBlocks);
    onBlocksChange(updatedBlocks);
  };

  const pullBlocksToDay = (targetDate: Date, availableStudyMinutes: number) => {
    if (availableStudyMinutes <= 0) return;
    const DEFAULT_START = timeToMinutes('09:00');
    const DEFAULT_END = timeToMinutes('18:00');
    const targetKey = toLocalKey(targetDate);

    const existingBlocks = blocks
      .filter((block) => toLocalKey(new Date(block.date)) === targetKey)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    let cursorMinutes = existingBlocks.reduce(
      (max, block) => Math.max(max, timeToMinutes(block.endTime)),
      DEFAULT_START
    );

    const candidates = blocks
      .filter((block) => {
        const blockDate = new Date(block.date);
        blockDate.setHours(0, 0, 0, 0);
        return (
          blockDate > targetDate &&
          block.status !== 'completed' &&
          block.status !== 'skipped'
        );
      })
      .sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.startTime.localeCompare(b.startTime);
      });

    if (candidates.length === 0) return;

    let studyMinutesMoved = 0;
    const movedBlocks: StudyBlock[] = [];
    const movedIds = new Set<string>();

    for (let i = 0; i < candidates.length; i++) {
      const block = candidates[i];
      if (block.isBreak) {
        continue;
      }

      if (studyMinutesMoved + block.durationMinutes > availableStudyMinutes) {
        break;
      }

      const nextEnd = cursorMinutes + block.durationMinutes;
      if (nextEnd > DEFAULT_END) break;

      movedBlocks.push({
        ...block,
        date: new Date(targetDate),
        startTime: minutesToTime(cursorMinutes),
        endTime: minutesToTime(nextEnd),
        status: 'scheduled' as const,
        updatedAt: new Date(),
      });
      movedIds.add(block.id);
      cursorMinutes = nextEnd;
      studyMinutesMoved += block.durationMinutes;

      const next = candidates[i + 1];
      if (next && next.isBreak && !movedIds.has(next.id)) {
        const breakEnd = cursorMinutes + next.durationMinutes;
        if (breakEnd <= DEFAULT_END) {
          movedBlocks.push({
            ...next,
            date: new Date(targetDate),
            startTime: minutesToTime(cursorMinutes),
            endTime: minutesToTime(breakEnd),
            updatedAt: new Date(),
          });
          movedIds.add(next.id);
          cursorMinutes = breakEnd;
          i += 1;
        }
      }
    }

    if (movedBlocks.length === 0) return;

    const movedMap = new Map(movedBlocks.map((block) => [block.id, block]));
    const updatedBlocks = blocks.map((block) => movedMap.get(block.id) ?? block);

    updatedBlocks.sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    setBlocks(updatedBlocks);
    onBlocksChange(updatedBlocks);
  };

  const handleAdjustDailyLimit = (date: Date, deltaMinutes: number) => {
    const key = toLocalKey(date);
    const current = getDailyLimitMinutes(date);
    const next = Math.max(0, current + deltaMinutes);
    setDailyLimits((prev) => ({ ...prev, [key]: next }));

    if (next <= 0) return;

    const dayBlocks = blocksByDay.get(key) ?? [];
    const sorted = [...dayBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
    let studyMinutes = 0;
    let keepIndex = -1;

    for (let i = 0; i < sorted.length; i++) {
      const block = sorted[i];
      if (!block.isBreak) {
        if (studyMinutes + block.durationMinutes > next) break;
        studyMinutes += block.durationMinutes;
      }
      keepIndex = i;
    }

    const overflowBlocks = sorted.slice(keepIndex + 1);
    if (overflowBlocks.length > 0) {
      moveBlocksToNextAllowedDay(date, overflowBlocks);
    }

    if (deltaMinutes > 0) {
      const availableStudyMinutes = Math.max(0, next - studyMinutes);
      pullBlocksToDay(date, availableStudyMinutes);
    }
  };

  // Navegação
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    setCurrentWeekStart(getWeekStart(today));
    if (isMobile) {
      setMobileDayIndex(weekIndexFromDate(today));
    }
  };

  const goToPreviousDay = () => {
    if (!isMobile) {
      goToPreviousWeek();
      return;
    }
    setMobileDayIndex((prev) => {
      if (prev > 0) return prev - 1;
      const newStart = new Date(currentWeekStart);
      newStart.setDate(newStart.getDate() - 7);
      setCurrentWeekStart(newStart);
      return 6;
    });
  };

  const goToNextDay = () => {
    if (!isMobile) {
      goToNextWeek();
      return;
    }
    setMobileDayIndex((prev) => {
      if (prev < 6) return prev + 1;
      const newStart = new Date(currentWeekStart);
      newStart.setDate(newStart.getDate() + 7);
      setCurrentWeekStart(newStart);
      return 0;
    });
  };

  // Handlers de arrastar
  const handleDragStart = (event: DragStartEvent) => {
    const block = blocks.find((b) => b.id === event.active.id);
    if (block) {
      setActiveBlock(block);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBlock(null);

    if (!over) return;

    // Reordenar dentro do mesmo dia
    if (active.id !== over.id) {
      const activeBlock = blocks.find((b) => b.id === active.id);
      const overBlock = blocks.find((b) => b.id === over.id);

      if (activeBlock && overBlock) {
        const oldIndex = blocks.indexOf(activeBlock);
        const newIndex = blocks.indexOf(overBlock);

        const newBlocks = arrayMove(blocks, oldIndex, newIndex);
        setBlocks(newBlocks);
        onBlocksChange(newBlocks);
      }
    }
  };

  // Handlers de blocos
  const handleAddBlock = (date: Date) => {
    const dayBlocks = blocks
      .filter((b) => isSameDay(new Date(b.date), date))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const defaultDurationMinutes = 60;
    const fallbackStartMinutes = 9 * 60;
    const lastEndTime = dayBlocks[dayBlocks.length - 1]?.endTime;
    let startMinutes = lastEndTime
      ? timeToMinutes(lastEndTime)
      : fallbackStartMinutes;

    if (startMinutes + defaultDurationMinutes > 24 * 60) {
      startMinutes = fallbackStartMinutes;
    }

    setBlockModalDefaults({
      startTime: minutesToTime(startMinutes),
      durationMinutes: defaultDurationMinutes,
    });
    setEditingBlock(null);
    setBlockModalDate(date);
    setIsBlockModalOpen(true);
  };

  const handleEditBlock = (block: StudyBlock) => {
    setEditingBlock(block);
    setBlockModalDate(new Date(block.date));
    setIsBlockModalOpen(true);
  };

  const handleDeleteBlock = (blockId: string) => {
    const newBlocks = blocks.filter((b) => b.id !== blockId);
    setBlocks(newBlocks);
    onBlocksChange(newBlocks);
  };

  const handleStartBlock = (block: StudyBlock) => {
    setSessionBlock(block);
    setIsSessionOpen(true);
  };

  const handleCompleteBlock = (blockId: string, minutesSpent?: number) => {
    const completedBlock = blocks.find((block) => block.id === blockId);
    setBlocks((prev) => {
      const next = prev.map((block) =>
        block.id === blockId
          ? {
              ...block,
              status: 'completed' as const,
              updatedAt: new Date(),
              durationMinutes: minutesSpent ? Math.round(minutesSpent) : block.durationMinutes,
            }
          : block
      );
      onBlocksChange(next);
      return next;
    });

    if (completedBlock && !completedBlock.isBreak) {
      const sameDayBreaks = blocks
        .filter(
          (block) =>
            block.isBreak &&
            block.status !== 'completed' &&
            isSameDay(new Date(block.date), new Date(completedBlock.date))
        )
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      const nextBreak = sameDayBreaks.find(
        (block) => timeToMinutes(block.startTime) >= timeToMinutes(completedBlock.endTime)
      );

      if (nextBreak) {
        setTimeout(() => {
          setSessionBlock(nextBreak);
          setIsSessionOpen(true);
        }, 450);
      }
    }
  };
  const handleSaveBlock = (data: BlockFormData) => {
    const endTime = minutesToTime(
      timeToMinutes(data.startTime) + data.durationMinutes
    );

    const fallbackSubject: Subject = {
      id: 'default',
      userId: 'user1',
      name: 'Sessao Livre',
      color: '#00B4FF',
      icon: 'book',
      priority: 5,
      difficulty: 5,
      targetHours: 0,
      completedHours: 0,
      totalHours: 0,
      sessionsCount: 0,
      averageScore: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const subject =
      data.isBreak || !data.subjectId
        ? undefined
        : subjects.find((s) => s.id === data.subjectId) ||
          editingBlock?.subject ||
          fallbackSubject;

    if (editingBlock) {
      const updatedBlock: StudyBlock = {
        ...editingBlock,
        date: data.date,
        startTime: data.startTime,
        endTime,
        durationMinutes: data.durationMinutes,
        isBreak: data.isBreak,
        subjectId: data.isBreak ? 'break' : subject?.id || 'default',
        subject,
        updatedAt: new Date(),
      };
      const newBlocks = blocks.map((b) =>
        b.id === editingBlock.id ? updatedBlock : b
      );
      setBlocks(newBlocks);
      onBlocksChange(newBlocks);
    } else {
      const newBlock: StudyBlock = {
        id: generateId(),
        userId: 'user1',
        subjectId: data.isBreak ? 'break' : subject?.id || 'default',
        subject,
        date: data.date,
        startTime: data.startTime,
        endTime,
        durationMinutes: data.durationMinutes,
        status: 'scheduled' as const,
        isBreak: data.isBreak,
        isAutoGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
      onBlocksChange(newBlocks);
    }

    setIsBlockModalOpen(false);
    setEditingBlock(null);
  };

  // Verificar se está visualizando a semana atual
  const isCurrentWeek = isSameDay(currentWeekStart, getWeekStart());
  const isViewingToday = isMobile && mobileDay ? isSameDay(mobileDay, new Date()) : false;

  return (
    <div className="h-full flex flex-col min-w-0">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5 sm:mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">
            Agenda Inteligente
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Otimização de cronograma de estudos com IA
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Botão de Gerar Agenda */}
          <Button
            variant="primary"
            onClick={() => setIsScheduleModalOpen(true)}
            loading={isGenerating}
            leftIcon={<Sparkles className="w-4 h-4" />}
            className="w-full sm:w-auto"
           
          >
            Gerar Agenda
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsRescheduleModalOpen(true)}
            leftIcon={<ArrowRightLeft className="w-4 h-4" />}
            className="w-full sm:w-auto"
           
          >
            Reagendar pendências
          </Button>
        </div>
      </div>

      {/* Navegação da Semana */}
      <Card className="mb-6" padding="sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between md:justify-start gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={isMobile ? goToPreviousDay : goToPreviousWeek}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-base md:text-lg font-heading font-bold text-white px-2 md:px-4">
              {isMobile
                ? formatDatePt(mobileDay)
                : `${formatDate(weekDates[0])} - ${formatDate(weekDates[6])}`}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={isMobile ? goToNextDay : goToNextWeek}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {!isMobile && !isCurrentWeek && (
            <Button
              variant="secondary"
              size="sm"
              onClick={goToCurrentWeek}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              className="w-full md:w-auto"
            >
              Semana Atual
            </Button>
          )}

          {isMobile && !isViewingToday && (
            <Button
              variant="secondary"
              size="sm"
              onClick={goToCurrentWeek}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              className="w-full md:w-auto"
            >
              Hoje
            </Button>
          )}

          {/* Estatisticas da Semana */}
          {!isMobile && (
            <div className="flex items-center justify-between md:justify-end gap-6 text-sm">
              <div>
                <span className="text-text-secondary">Total de Horas: </span>
                <span className="font-bold text-white">
                  {(blocks.filter((b) => !b.isBreak).reduce((sum, b) => sum + b.durationMinutes, 0) / 60).toFixed(1)}h
                </span>
              </div>
              <div>
                <span className="text-text-secondary">Sessoes: </span>
                <span className="font-bold text-white">
                  {blocks.filter((b) => !b.isBreak).length}
                </span>
              </div>
            </div>
          )}
        </div>
        {isMobile && (
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              Total: {(mobileStudyMinutes / 60).toFixed(1)}h
            </span>
            <span>{mobileSessions} sessoes</span>
          </div>
        )}
      </Card>

      {/* Grade do Planner */}
      <div className="flex-1 overflow-x-hidden md:overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 min-h-[500px] pb-4">
            {visibleDates.map((date) => {
              const dateKey = date.toISOString().split('T')[0];
      const dayBlocks = blocksByDay.get(dateKey) || [];

      return (
        <DayColumn
          key={dateKey}
          date={date}
          blocks={dayBlocks}
          dailyLimitMinutes={getDailyLimitMinutes(date)}
          onAdjustDailyLimit={handleAdjustDailyLimit}
          onAddBlock={handleAddBlock}
          onEditBlock={handleEditBlock}
          onDeleteBlock={handleDeleteBlock}
          onStartBlock={handleStartBlock}
        />
      );
    })}
          </div>

          {/* Overlay de Arrastar */}
          <DragOverlay>
            {activeBlock && (
              <TimeBlock block={activeBlock} isDragging />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <BlockFormModal
        isOpen={isBlockModalOpen}
        onClose={() => {
          setIsBlockModalOpen(false);
          setEditingBlock(null);
        }}
        onSave={handleSaveBlock}
        subjects={subjects}
        date={blockModalDate}
        block={editingBlock}
        defaultStartTime={blockModalDefaults.startTime}
        defaultDurationMinutes={blockModalDefaults.durationMinutes}
      />

      <StudyBlockSessionModal
        isOpen={isSessionOpen}
        block={sessionBlock}
        onClose={() => setIsSessionOpen(false)}
        onComplete={(blockId, minutesSpent) => {
          handleCompleteBlock(blockId, minutesSpent ?? undefined);
        }}
      />

      {isScheduleModalOpen && (
        <div className="app-modal-overlay">
          <div className="app-modal-panel">
            <Card className="relative" padding="lg">
              <h2 className="text-xl font-heading font-bold text-white mb-2">
                Definir período do cronograma
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                Informe até quando a agenda deve ir.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Início
                  </label>
                  <div className="input-field">
                    {formatDatePt(new Date())}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Data final
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    min={toLocalKey(new Date())}
                    value={scheduleEndDate}
                    onChange={(e) => setScheduleEndDate(e.target.value)}
                  />
                </div>
                {scheduleError && (
                  <p className="text-sm text-red-400">{scheduleError}</p>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsScheduleModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    if (!scheduleEndDate) {
                      setScheduleError('Selecione a data final.');
                      return;
                    }
                    const startDate = new Date();
                    startDate.setHours(0, 0, 0, 0);
                    const endDate = parseLocalKey(scheduleEndDate);
                    endDate.setHours(0, 0, 0, 0);
                    if (endDate < startDate) {
                      setScheduleError('A data final deve ser após o início.');
                      return;
                    }
                    setIsScheduleModalOpen(false);
                    onGenerateSchedule({ startDate, endDate });
                  }}
                >
                  Gerar
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {isRescheduleModalOpen && (
        <div className="app-modal-overlay">
          <div className="app-modal-panel">
            <Card className="relative" padding="lg">
              <h2 className="text-xl font-heading font-bold text-white mb-2">
                Reagendar pendências
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                Mova blocos não concluídos de um dia para outro.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Dia de origem
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={rescheduleSourceDate}
                    onChange={(e) => setRescheduleSourceDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Dia de destino
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={rescheduleTargetDate}
                    onChange={(e) => setRescheduleTargetDate(e.target.value)}
                  />
                </div>
                {rescheduleError && (
                  <p className="text-sm text-red-400">{rescheduleError}</p>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsRescheduleModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    if (!rescheduleSourceDate || !rescheduleTargetDate) {
                      setRescheduleError('Selecione os dias para reagendar.');
                      return;
                    }
                    if (rescheduleSourceDate === rescheduleTargetDate) {
                      setRescheduleError('Escolha dias diferentes.');
                      return;
                    }

                    const sourceDate = parseLocalKey(rescheduleSourceDate);
                    const targetDate = parseLocalKey(rescheduleTargetDate);
                    sourceDate.setHours(0, 0, 0, 0);
                    targetDate.setHours(0, 0, 0, 0);

                    const sourceKey = toLocalKey(sourceDate);
                    const targetKey = toLocalKey(targetDate);

                    const sourceBlocks = blocks
                      .filter((block) => toLocalKey(new Date(block.date)) === sourceKey)
                      .filter((block) => block.status !== 'completed');

                    if (sourceBlocks.length === 0) {
                      setRescheduleError('Não há blocos pendentes no dia selecionado.');
                      return;
                    }

                    const targetBlocks = blocks.filter(
                      (block) => toLocalKey(new Date(block.date)) === targetKey
                    );
                    const lastEndMinutes = targetBlocks.reduce((max, block) => {
                      const endMinutes = timeToMinutes(block.endTime);
                      return Math.max(max, endMinutes);
                    }, timeToMinutes('09:00'));

                    let cursorMinutes = lastEndMinutes;
                    const movedBlocks: StudyBlock[] = [];

                    const orderedSourceBlocks = [...sourceBlocks].sort((a, b) =>
                      a.startTime.localeCompare(b.startTime)
                    );

                    for (const block of orderedSourceBlocks) {
                      const nextEnd = cursorMinutes + block.durationMinutes;
                      if (nextEnd > 24 * 60) {
                        setRescheduleError(
                          'Não há espaço suficiente no dia de destino.'
                        );
                        return;
                      }

                      movedBlocks.push({
                        ...block,
                        date: new Date(targetDate),
                        startTime: minutesToTime(cursorMinutes),
                        endTime: minutesToTime(nextEnd),
                        status: block.isBreak ? block.status : 'scheduled',
                        updatedAt: new Date(),
                      });
                      cursorMinutes = nextEnd;
                    }

                    const movedById = new Map(movedBlocks.map((block) => [block.id, block]));
                    const updatedBlocks = blocks.map((block) => movedById.get(block.id) ?? block);

                    updatedBlocks.sort((a, b) => {
                      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
                      if (dateDiff !== 0) return dateDiff;
                      return a.startTime.localeCompare(b.startTime);
                    });

                    setBlocks(updatedBlocks);
                    onBlocksChange(updatedBlocks);
                    setIsRescheduleModalOpen(false);
                  }}
                >
                  Reagendar
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}






