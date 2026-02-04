import type { StudyBlock, StudyBlockType, Subject, StudyPreferences } from '@/types';
import { generateId, minutesToTime, timeToMinutes } from '@/lib/utils';

export type SubjectArea = 'exatas' | 'humanas' | 'biologicas' | 'linguagens' | 'geral';
export type SubjectLevel = 'basico' | 'intermediario' | 'avancado';
export type SessionType = 'teoria' | 'pratica' | 'revisao' | 'simulado';

export interface SubjectMeta {
  area: SubjectArea;
  nivel: SubjectLevel;
  pesoNoExame: number;
  prerequisitos?: string[];
  tipo?: SessionType;
}

export interface ChronologicalScheduleConfig {
  subjects: Subject[];
  preferences: StudyPreferences;
  targetDate?: Date;
  startDate: Date;
  endDate: Date;
  preferredStart: string;
  preferredEnd: string;
  maxBlockMinutes: number;
  breakMinutes: number;
  restDays?: number[];
  dailyLimitByDate?: Record<string, number>;
  firstCycleAllSubjects?: boolean;
  completedLessonsTotal?: number;
  completedLessonsBySubject?: Record<string, number>;
  simuladoRules?: {
    minLessonsBeforeSimulated: number;
    minLessonsPerSubject?: number;
    minDaysBeforeSimulated: number;
    frequencyDays: number;
  };
  debug?: boolean;
}

export interface ChronologicalScheduleResult {
  blocks: StudyBlock[];
  totalHours: number;
  subjectDistribution: Record<string, number>;
  phaseByDate: Record<string, string>;
  debugLog: string[];
}

const AREA_ROTATION: SubjectArea[] = ['exatas', 'humanas', 'biologicas', 'linguagens'];

const SUBJECT_AREA_MAP: Record<string, SubjectArea> = {
  matematica: 'exatas',
  física: 'exatas',
  fisica: 'exatas',
  química: 'exatas',
  quimica: 'exatas',
  biologia: 'biologicas',
  geografia: 'humanas',
  historia: 'humanas',
  sociologia: 'humanas',
  filosofia: 'humanas',
  português: 'linguagens',
  portugues: 'linguagens',
  linguagens: 'linguagens',
  redação: 'linguagens',
  redacao: 'linguagens',
  atualidades: 'humanas',
  direito: 'humanas',
  informática: 'exatas',
  informatica: 'exatas',
};

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function inferSubjectMeta(subject: Subject): SubjectMeta {
  if (subject.area || subject.nivel || subject.pesoNoExame) {
    const areaNormalized = subject.area ? normalize(subject.area) : '';
    const areaFromField: SubjectArea =
      areaNormalized.includes('exat')
        ? 'exatas'
        : areaNormalized.includes('human')
        ? 'humanas'
        : areaNormalized.includes('biolog')
        ? 'biologicas'
        : areaNormalized.includes('ling')
        ? 'linguagens'
        : 'geral';

    const nivelNormalized = subject.nivel ? normalize(subject.nivel) : '';
    const nivelFromField: SubjectLevel =
      nivelNormalized.includes('avan')
        ? 'avancado'
        : nivelNormalized.includes('inter')
        ? 'intermediario'
        : nivelNormalized.includes('bas')
        ? 'basico'
        : 'basico';

    const pesoFromField =
      typeof subject.pesoNoExame === 'number'
        ? Math.min(5, Math.max(1, Math.round(subject.pesoNoExame)))
        : undefined;

    return {
      area: areaFromField,
      nivel: nivelFromField,
      pesoNoExame: pesoFromField ?? Math.min(5, Math.max(1, Math.round((subject.priority || 5) / 2))),
    };
  }

  const normalized = normalize(subject.name);
  let area: SubjectArea = 'geral';
  Object.keys(SUBJECT_AREA_MAP).forEach((key) => {
    if (normalized.includes(key)) {
      area = SUBJECT_AREA_MAP[key];
    }
  });

  const difficulty = subject.difficulty ?? 5;
  const nivel: SubjectLevel =
    difficulty <= 4 ? 'basico' : difficulty <= 7 ? 'intermediario' : 'avancado';
  const pesoNoExame = Math.min(5, Math.max(1, Math.round((subject.priority || 5) / 2)));

  return { area, nivel, pesoNoExame };
}

const phaseForWeek = (weekIndex: number) => {
  if (weekIndex <= 2) return { key: 'base', label: 'Base (Fundamentos)' };
  if (weekIndex <= 5) return { key: 'aprofundamento', label: 'Aprofundamento' };
  return { key: 'consolidacao', label: 'Consolidação' };
};

export function getPhaseForDate(date: Date, startDate: Date) {
  const diff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const weekIndex = Math.floor(diff / 7) + 1;
  return phaseForWeek(weekIndex);
}

function buildDateRange(startDate: Date, endDate: Date) {
  const dates: Date[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function getDailyMinutes(preferredStart: string, preferredEnd: string, hoursPerDay: number) {
  const windowMinutes = Math.max(0, timeToMinutes(preferredEnd) - timeToMinutes(preferredStart));
  const desiredMinutes = Math.max(0, hoursPerDay) * 60;
  return Math.min(windowMinutes, desiredMinutes);
}

function computeBlockMinutes(
  subject: Subject,
  meta: SubjectMeta,
  baseMax: number,
  sessionType: SessionType
) {
  const difficulty = subject.difficulty ?? 5;
  const difficultyFactor = 0.6 + (1 - difficulty / 12); // 0.6 - 1.2
  const levelFactor = meta.nivel === 'avancado' ? 0.8 : meta.nivel === 'intermediario' ? 0.9 : 1;
  const weightFactor = 0.85 + (meta.pesoNoExame - 3) * 0.05;
  let duration = Math.round(baseMax * difficultyFactor * levelFactor * weightFactor);
  if (sessionType === 'revisao') duration = Math.round(duration * 0.7);
  if (sessionType === 'simulado') duration = Math.round(duration * 1.1);
  return Math.min(baseMax, Math.max(25, duration));
}

function pickTaskType(
  phaseKey: string,
  lastType: SessionType | undefined,
  hasLesson: boolean
): SessionType {
  if (!hasLesson) {
    return 'teoria';
  }
  if (phaseKey === 'base') {
    if (lastType === 'teoria') return 'pratica';
    return 'teoria';
  }
  if (phaseKey === 'aprofundamento') {
    if (lastType === 'pratica') return 'teoria';
    return 'pratica';
  }
  return lastType === 'pratica' ? 'simulado' : 'pratica';
}

const SESSION_TO_BLOCK_TYPE: Record<SessionType, StudyBlockType> = {
  teoria: 'AULA',
  pratica: 'EXERCICIOS',
  revisao: 'REVISAO',
  simulado: 'SIMULADO_COMPLETO',
};

function buildBlockDescription(
  blockType: StudyBlockType,
  goal: StudyPreferences['goal'],
  areaLabel?: string
) {
  if (blockType === 'AULA') return 'Aula + anotacoes + 5 min de resumo';
  if (blockType === 'EXERCICIOS') return 'Lista de exercicios + revisar erros';
  if (blockType === 'REVISAO') return 'Revisao guiada (flashcards/resumo)';
  if (blockType === 'SIMULADO_AREA') {
    return `Simulado de ${areaLabel || 'area'} + tempo cronometrado`;
  }
  if (blockType === 'SIMULADO_COMPLETO') {
    if (goal === 'medicina') return 'Simulado de medicina + tempo cronometrado';
    if (goal === 'concurso') return 'Simulado de concurso + correcao';
    return 'Simulado ENEM + tempo cronometrado';
  }
  if (blockType === 'ANALISE') {
    return buildAnalysisDescription(goal);
  }
  return 'Sessao de estudo';
}

function buildAnalysisDescription(goal: StudyPreferences['goal']) {
  if (goal === 'medicina') return 'Correcao + caderno de erros (60-90min)';
  if (goal === 'concurso') return 'Correcao + mapa de erros';
  return 'Correcao + analise de desempenho';
}

function createSimuladoSubject(): Subject {
  return {
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
}

export function generateChronologicalSchedule(config: ChronologicalScheduleConfig): ChronologicalScheduleResult {
  const debugLog: string[] = [];
  const log = (message: string) => {
    if (config.debug) debugLog.push(message);
  };

  const dates = buildDateRange(config.startDate, config.endDate);
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const restDays = config.restDays ?? [];
  const preferredDays = config.preferences.daysOfWeek?.length
    ? config.preferences.daysOfWeek
    : allDays;
  const activeDays = preferredDays.filter((day) => !restDays.includes(day));
  const excludeDays = allDays.filter((day) => !activeDays.includes(day));
  const subjectMeta = new Map(config.subjects.map((s) => [s.id, inferSubjectMeta(s)]));
  const simuladoSubject = createSimuladoSubject();
  const simuladoMeta: SubjectMeta = { area: 'geral', nivel: 'intermediario', pesoNoExame: 5 };
  const simuladoRules = {
    minLessonsBeforeSimulated: 10,
    minLessonsPerSubject: 2,
    minDaysBeforeSimulated: 14,
    frequencyDays: 7,
    minLessonsBeforeAreaSimulated: 6,
    minDaysBeforeAreaSimulated: 7,
    ...(config.simuladoRules || {}),
  };
  let lastSimuladoDate: Date | null = null;
  const completedLessonsTotal = config.completedLessonsTotal ?? 0;
  const completedLessonsBySubject = config.completedLessonsBySubject ?? {};
  const primarySubjects = [...config.subjects]
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 3)
    .map((subject) => subject.id);

  const canScheduleSimuladoArea = (date: Date) => {
    const daysSinceStart = Math.floor(
      (date.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceStart < simuladoRules.minDaysBeforeAreaSimulated) return false;
    if (completedLessonsTotal < simuladoRules.minLessonsBeforeAreaSimulated) return false;
    return true;
  };

  const canScheduleSimuladoCompleto = (date: Date) => {
    const daysSinceStart = Math.floor(
      (date.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceStart < simuladoRules.minDaysBeforeSimulated) return false;
    if (completedLessonsTotal < simuladoRules.minLessonsBeforeSimulated) return false;
    if (simuladoRules.minLessonsPerSubject && primarySubjects.length > 0) {
      const ready = primarySubjects.every(
        (subjectId) => (completedLessonsBySubject[subjectId] || 0) >= simuladoRules.minLessonsPerSubject!
      );
      if (!ready) return false;
    }
    if (lastSimuladoDate) {
      const gap = Math.floor(
        (date.getTime() - lastSimuladoDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (gap < simuladoRules.frequencyDays) return false;
    }
    return true;
  };

  const dailyMinutes = getDailyMinutes(
    config.preferredStart,
    config.preferredEnd,
    config.preferences.hoursPerDay || 2
  );
  const windowMinutes = Math.max(
    0,
    timeToMinutes(config.preferredEnd) - timeToMinutes(config.preferredStart)
  );
  const getDailyLimit = (date: Date) => {
    const dayKey = date.toISOString().split('T')[0];
    const override = config.dailyLimitByDate?.[dayKey];
    if (typeof override === 'number') {
      return Math.min(windowMinutes, Math.max(0, override));
    }
    return dailyMinutes;
  };
  const slotSize = Math.max(25, config.maxBlockMinutes);
  const totalSlots = Math.max(
    1,
    dates
      .filter((date) => !excludeDays.includes(date.getDay()))
      .reduce((sum, date) => sum + Math.max(1, Math.floor(getDailyLimit(date) / slotSize)), 0)
  );

  const weightSum = config.subjects.reduce(
    (sum, s) => sum + (subjectMeta.get(s.id)?.pesoNoExame || 1),
    0
  );
  const remainingSlots = new Map(
    config.subjects.map((s) => [
      s.id,
      Math.max(1, Math.round(((subjectMeta.get(s.id)?.pesoNoExame || 1) / weightSum) * totalSlots)),
    ])
  );

  const phaseByDate: Record<string, string> = {};
  const reviewQueue = new Map<string, string[]>();
  const plannedLessonsBySubject = new Map<string, number>();
  const plannedReviewsBySubject = new Map<string, number>();
  const blocks: StudyBlock[] = [];
  const lastTypeBySubject = new Map<string, SessionType>();
  const globalUsage = new Map<string, number>();
  const globalRecentSubjects: string[] = [];
  let globalLastSubjectId = '';
  let areaCursor = 0;
  let lastDaySubjects: Set<string> = new Set();

  for (const date of dates) {
    if (excludeDays.includes(date.getDay())) continue;
    const phase = getPhaseForDate(date, config.startDate);
    const dayKey = date.toISOString().split('T')[0];
    phaseByDate[dayKey] = phase.label;

    let lastSubjectId = globalLastSubjectId;
    const dailyCount = new Map<string, number>();
    const recentSubjects: string[] = [];
    let blocksSinceReview = 0;
    const daySubjects = new Set<string>();
    const dailyMinutesLimit = getDailyLimit(date);

    const dueReviews = reviewQueue.get(dayKey) || [];
    const reviewIndex = new Map<string, number>();
    for (const subjectId of dueReviews) {
      reviewIndex.set(subjectId, (reviewIndex.get(subjectId) || 0) + 1);
    }

    let currentTime = timeToMinutes(config.preferredStart);
    const endTime = timeToMinutes(config.preferredEnd);
    let plannedMinutes = 0;

    while (
      currentTime + 25 <= endTime &&
      plannedMinutes < dailyMinutesLimit
    ) {
      const desiredArea = AREA_ROTATION[areaCursor % AREA_ROTATION.length];
      const availableMinutes = Math.min(dailyMinutesLimit - plannedMinutes, endTime - currentTime);

      let candidatePool = config.subjects.filter((subject) => {
        const count = dailyCount.get(subject.id) || 0;
        return count < 2;
      });

      if (candidatePool.length === 0) break;

      if (config.firstCycleAllSubjects) {
        const pendingFirstLesson = candidatePool.filter((subject) => {
          const hasLesson =
            (completedLessonsBySubject[subject.id] || 0) > 0 ||
            (plannedLessonsBySubject.get(subject.id) || 0) > 0;
          return !hasLesson;
        });
        if (pendingFirstLesson.length > 0) {
          candidatePool = pendingFirstLesson;
        }
      }

      const reviewCandidates = candidatePool.filter((subject) => (reviewIndex.get(subject.id) || 0) > 0);

      const ranked = (reviewCandidates.length > 0 ? reviewCandidates : candidatePool)
        .map((subject) => {
          const meta = subjectMeta.get(subject.id)!;
          const weight = meta.pesoNoExame;
          const remaining = remainingSlots.get(subject.id) || 0;
          const hasLesson =
            (completedLessonsBySubject[subject.id] || 0) > 0 ||
            (plannedLessonsBySubject.get(subject.id) || 0) > 0;
          const sameSubject = subject.id === lastSubjectId;
          const recentPenalty = recentSubjects.includes(subject.id) ? -12 : 0;
          const globalPenalty = globalRecentSubjects.includes(subject.id) ? -10 : 0;
          const isFirstBlock = plannedMinutes === 0;
          const prevDayPenalty = lastDaySubjects.has(subject.id)
            ? isFirstBlock
              ? -16
              : -6
            : 0;
          const sameArea = meta.area === desiredArea;
          const timeMinutes = currentTime;
          const bucket = timeMinutes < 12 * 60 ? 'manha' : timeMinutes < 18 * 60 ? 'tarde' : 'noite';
          const usagePenalty = (globalUsage.get(subject.id) || 0) * 3;
          let score = weight * 10 + remaining * 2 - usagePenalty;
          if (sameArea) score += 12;
          if (!sameSubject) score += 8;
          if (!hasLesson) score += 18;
          score += recentPenalty + globalPenalty + prevDayPenalty;
          if (bucket === 'manha' && meta.nivel === 'avancado') score += 6;
          if (bucket === 'noite' && meta.nivel === 'basico') score += 4;
          return { subject, score };
        })
        .sort((a, b) => b.score - a.score);

      let chosen = ranked.find((item) => item.subject.id !== lastSubjectId);
      if (!chosen) chosen = ranked[0];
      if (!chosen) break;

      const meta = subjectMeta.get(chosen.subject.id)!;
      let sessionType: SessionType = 'teoria';
      const alreadyHasLesson =
        (completedLessonsBySubject[chosen.subject.id] || 0) > 0 ||
        (plannedLessonsBySubject.get(chosen.subject.id) || 0) > 0;

      if (reviewIndex.get(chosen.subject.id) && alreadyHasLesson) {
        sessionType = 'revisao';
        reviewIndex.set(chosen.subject.id, (reviewIndex.get(chosen.subject.id) || 1) - 1);
        blocksSinceReview = 0;
      } else if (blocksSinceReview >= 3 && recentSubjects.length >= 2 && alreadyHasLesson) {
        sessionType = 'revisao';
        blocksSinceReview = 0;
      } else {
        sessionType = pickTaskType(phase.key, lastTypeBySubject.get(chosen.subject.id), alreadyHasLesson);
        lastTypeBySubject.set(chosen.subject.id, sessionType);
        blocksSinceReview += 1;
      }

      if (!alreadyHasLesson && sessionType !== 'teoria') {
        sessionType = 'teoria';
      }

      if (sessionType === 'simulado') {
        const shouldArea = canScheduleSimuladoArea(date);
        const shouldCompleto = canScheduleSimuladoCompleto(date);
        if (!shouldArea && !shouldCompleto) {
          sessionType = 'pratica';
        }
      }
      if (sessionType === 'pratica' && !alreadyHasLesson) {
        sessionType = 'teoria';
      }

      let blockType = SESSION_TO_BLOCK_TYPE[sessionType];
      let simuladoAreaLabel: string | undefined;
      if (sessionType === 'simulado') {
        const useCompleto = canScheduleSimuladoCompleto(date);
        blockType = useCompleto ? 'SIMULADO_COMPLETO' : 'SIMULADO_AREA';
        if (blockType === 'SIMULADO_AREA') {
          simuladoAreaLabel =
            meta.area === 'exatas'
              ? 'Matematica'
              : meta.area === 'humanas'
              ? 'Humanas'
              : meta.area === 'biologicas'
              ? 'Natureza'
              : meta.area === 'linguagens'
              ? 'Linguagens'
              : 'Area';
        }
      }

      const isSimulado = blockType === 'SIMULADO_AREA' || blockType === 'SIMULADO_COMPLETO';
      const blockSubject = isSimulado ? simuladoSubject : chosen.subject;
      const blockMeta = isSimulado ? simuladoMeta : meta;

      let baseMax = config.maxBlockMinutes;
      if (isSimulado) {
        baseMax = Math.max(config.maxBlockMinutes, 90);
      }

      let blockMinutes = computeBlockMinutes(blockSubject, blockMeta, baseMax, sessionType);
      blockMinutes = Math.min(blockMinutes, availableMinutes);
      if (blockMinutes < 25) break;

      const block: StudyBlock = {
        id: generateId(),
        userId: 'user1',
        subjectId: blockSubject.id,
        subject: blockSubject,
        date,
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(currentTime + blockMinutes),
        durationMinutes: blockMinutes,
        status: 'scheduled',
        isBreak: false,
        isAutoGenerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionType,
        phase: phase.key,
        area: blockMeta.area,
        type: blockType,
        description: buildBlockDescription(blockType, config.preferences.goal, simuladoAreaLabel),
        relatedSubjectId: sessionType === 'revisao' ? chosen.subject.id : undefined,
      } as StudyBlock;

      blocks.push(block);
      if (!isSimulado) {
        dailyCount.set(chosen.subject.id, (dailyCount.get(chosen.subject.id) || 0) + 1);
        remainingSlots.set(chosen.subject.id, Math.max(0, (remainingSlots.get(chosen.subject.id) || 0) - 1));
        globalUsage.set(chosen.subject.id, (globalUsage.get(chosen.subject.id) || 0) + 1);
        daySubjects.add(chosen.subject.id);
        recentSubjects.push(chosen.subject.id);
      }
      if (recentSubjects.length > 3) recentSubjects.shift();
      if (!isSimulado) {
        globalRecentSubjects.push(chosen.subject.id);
      } else {
        globalRecentSubjects.push(simuladoSubject.id);
      }
      if (globalRecentSubjects.length > 5) globalRecentSubjects.shift();

      if (sessionType === 'simulado') {
        lastSimuladoDate = new Date(date);
      }

      if (sessionType === 'teoria') {
        plannedLessonsBySubject.set(
          chosen.subject.id,
          (plannedLessonsBySubject.get(chosen.subject.id) || 0) + 1
        );
        const offsets = [1, 7, 30];
        offsets.forEach((offset) => {
          const reviewDate = new Date(date);
          reviewDate.setDate(reviewDate.getDate() + offset);
          if (reviewDate < config.startDate || reviewDate > config.endDate) return;
          const key = reviewDate.toISOString().split('T')[0];
          const list = reviewQueue.get(key) || [];
          list.push(chosen.subject.id);
          reviewQueue.set(key, list);
        });
      }

      currentTime += blockMinutes;
      plannedMinutes += blockMinutes;
      lastSubjectId = blockSubject.id;
      globalLastSubjectId = lastSubjectId;
      areaCursor += 1;

      if (isSimulado) {
        const analysisMinutes = Math.min(availableMinutes - blockMinutes, Math.max(45, Math.min(90, blockMinutes)));
        if (analysisMinutes >= 25 && currentTime + analysisMinutes <= endTime) {
          const analysisBlock: StudyBlock = {
            id: generateId(),
            userId: 'user1',
            subjectId: simuladoSubject.id,
            subject: simuladoSubject,
            date,
            startTime: minutesToTime(currentTime),
            endTime: minutesToTime(currentTime + analysisMinutes),
            durationMinutes: analysisMinutes,
            status: 'scheduled',
            isBreak: false,
            isAutoGenerated: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            sessionType: 'pratica',
            phase: phase.key,
            area: simuladoMeta.area,
            type: 'ANALISE',
            description: buildAnalysisDescription(config.preferences.goal),
            relatedSubjectId: chosen.subject.id,
          } as StudyBlock;
          blocks.push(analysisBlock);
          currentTime += analysisMinutes;
          plannedMinutes += analysisMinutes;
        }
      }

      if (config.breakMinutes > 0 && currentTime + config.breakMinutes <= endTime) {
        blocks.push({
          id: generateId(),
          userId: 'user1',
          subjectId: 'break',
          date,
          startTime: minutesToTime(currentTime),
          endTime: minutesToTime(currentTime + config.breakMinutes),
          durationMinutes: config.breakMinutes,
          status: 'scheduled',
          isBreak: true,
          isAutoGenerated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        currentTime += config.breakMinutes;
      }
    }

    log(`Dia ${dayKey}: ${blocks.filter((b) => b.date === date && !b.isBreak).length} blocos.`);
    lastDaySubjects = daySubjects;
  }

  const sortedBlocks = [...blocks].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  const totalMinutes = sortedBlocks.filter((b) => !b.isBreak).reduce((sum, b) => sum + b.durationMinutes, 0);
  const subjectDistribution: Record<string, number> = {};
  sortedBlocks
    .filter((b) => !b.isBreak)
    .forEach((b) => {
      subjectDistribution[b.subjectId] = (subjectDistribution[b.subjectId] || 0) + b.durationMinutes / 60;
    });

  return {
    blocks: sortedBlocks,
    totalHours: Number((totalMinutes / 60).toFixed(1)),
    subjectDistribution,
    phaseByDate,
    debugLog,
  };
}

export function replanAfterPerformanceUpdate(
  config: ChronologicalScheduleConfig,
  performance: Record<string, 'completed' | 'skipped' | 'late'>
) {
  const updatedSubjects = config.subjects.map((subject) => {
    const status = performance[subject.id];
    if (status === 'skipped') {
      return { ...subject, priority: Math.min(10, (subject.priority || 5) + 1) };
    }
    return subject;
  });
  return generateChronologicalSchedule({ ...config, subjects: updatedSubjects, debug: true });
}
