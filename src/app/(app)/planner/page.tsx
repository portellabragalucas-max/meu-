'use client';

/**
 * Smart Planner Page
 * Agenda semanal com IA e arrastar e soltar
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WeeklyPlanner } from '@/components/planner';
import { generateWeeklySchedule } from '@/services/studyAlgorithm';
import { useLocalStorage } from '@/hooks';
import { getWeekStart, timeToMinutes, minutesToTime } from '@/lib/utils';
import type { StudyBlock, Subject, StudyPreferences } from '@/types';

// Blocos iniciais vazios
const initialBlocks: StudyBlock[] = [];

export default function PlannerPage() {
  const [subjects] = useLocalStorage<Subject[]>('nexora_subjects', []);
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
  const [, setScheduleRange] = useLocalStorage<{ startDate: string; endDate: string } | null>(
    'nexora_schedule_range',
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (blocks.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allowedDays = studyPrefs.daysOfWeek ?? [];
    const isAllowedDay = (date: Date) =>
      allowedDays.length === 0 || allowedDays.includes(date.getDay());

    const toLocalKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}`;

    const missedBlocks = blocks
      .filter((block) => {
        const blockDate = new Date(block.date);
        blockDate.setHours(0, 0, 0, 0);
        return blockDate < today && block.status !== 'completed' && block.status !== 'skipped';
      })
      .sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.startTime.localeCompare(b.startTime);
      });

    if (missedBlocks.length === 0) return;

    const missedIds = new Set(missedBlocks.map((block) => block.id));
    const baseBlocks = blocks.filter((block) => !missedIds.has(block.id));
    const blocksByDay = new Map<string, StudyBlock[]>();

    for (const block of baseBlocks) {
      const key = toLocalKey(new Date(block.date));
      const list = blocksByDay.get(key) ?? [];
      list.push(block);
      blocksByDay.set(key, list);
    }

    const DEFAULT_START = timeToMinutes('09:00');
    const DEFAULT_END = timeToMinutes('18:00');

    const movedBlocks: StudyBlock[] = [];
    let cursorDate = new Date(today);

    const findNextAvailableDay = (date: Date) => {
      const next = new Date(date);
      while (!isAllowedDay(next)) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    };

    cursorDate = findNextAvailableDay(cursorDate);

    for (const block of missedBlocks) {
      let placed = false;
      while (!placed) {
        cursorDate = findNextAvailableDay(cursorDate);
        const dayKey = toLocalKey(cursorDate);
        const dayBlocks = blocksByDay.get(dayKey) ?? [];
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
          blocksByDay.set(dayKey, dayBlocks);
          placed = true;
        } else {
          cursorDate = new Date(cursorDate);
          cursorDate.setDate(cursorDate.getDate() + 1);
        }
      }
    }

    if (movedBlocks.length === 0) return;

    const updatedBlocks = [...baseBlocks, ...movedBlocks].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    setBlocks(updatedBlocks);
  }, [blocks, setBlocks, studyPrefs.daysOfWeek]);
 
  useEffect(() => {
    if (subjects.length === 0 && blocks.length > 0) {
      setBlocks([]);
      return;
    }

    if (subjects.length === 0) return;

    const subjectsById = new Map(subjects.map((s) => [s.id, s]));
    setBlocks((prev) => {
      const next = prev
        .filter((block) => block.isBreak || subjectsById.has(block.subjectId))
        .map((block) =>
          block.isBreak
            ? block
            : {
                ...block,
                subject: subjectsById.get(block.subjectId),
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

  const handleGenerateSchedule = async (range?: { startDate: Date; endDate: Date }) => {
    if (subjects.length === 0) {
      alert('Adicione disciplinas antes de gerar a agenda.');
      return;
    }
    setIsGenerating(true);

    // Simular delay da API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Gerar agenda usando o algoritmo
    const activeDays = studyPrefs.daysOfWeek ?? [];
    const excludeDays =
      activeDays.length > 0
        ? [0, 1, 2, 3, 4, 5, 6].filter((day) => !activeDays.includes(day))
        : [0];

    const startDate = range?.startDate ?? getWeekStart(new Date());
    const endDate = range?.endDate ?? new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);

    const schedule = generateWeeklySchedule({
      userId: 'user1',
      subjects,
      preferredStart: '09:00',
      preferredEnd: '18:00',
      maxBlockMinutes: 120,
      breakMinutes: 15,
      excludeDays,
      startDate,
      endDate,
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
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
    setIsGenerating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-120px)]"
    >
      <WeeklyPlanner
        initialBlocks={blocks}
        onBlocksChange={handleBlocksChange}
        onGenerateSchedule={handleGenerateSchedule}
        isGenerating={isGenerating}
        subjects={subjects}
        defaultDailyLimitMinutes={studyPrefs.hoursPerDay * 60}
        allowedDays={studyPrefs.daysOfWeek}
      />
    </motion.div>
  );
}
