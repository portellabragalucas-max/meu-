'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Button, Card, ProgressBar } from '@/components/ui';
import type {
  DailyAvailabilityByWeekday,
  DailyHoursByWeekday,
  HardSubjectsPeriodPreference,
  PresetWizardAnswers,
  StudyPreferences,
  StudyStylePreference,
  UserSettings,
  WeekdayKey,
} from '@/types';
import { computeStudyPreferences } from '@/services/presetConfigurator';
import { cn, timeToMinutes } from '@/lib/utils';

interface PresetConfigWizardProps {
  isOpen: boolean;
  presetId: string;
  presetName: string;
  baseSettings: UserSettings;
  onClose: () => void;
  onApply: (settings: UserSettings, studyPrefs: StudyPreferences, answers: PresetWizardAnswers) => void;
}

const STEP_TITLES = ['Disponibilidade', 'Blocos', 'Periodo', 'Estilo', 'Prova'] as const;
const STEP_TITLES_SHORT = ['Disp.', 'Blocos', 'Periodo', 'Estilo', 'Prova'] as const;
const DAY_OPTIONS: { label: string; value: number; key: WeekdayKey }[] = [
  { label: 'Dom', value: 0, key: 'dom' },
  { label: 'Seg', value: 1, key: 'seg' },
  { label: 'Ter', value: 2, key: 'ter' },
  { label: 'Qua', value: 3, key: 'qua' },
  { label: 'Qui', value: 4, key: 'qui' },
  { label: 'Sex', value: 5, key: 'sex' },
  { label: 'Sab', value: 6, key: 'sab' },
];
const FOCUS_OPTIONS = [30, 45, 50, 60, 90] as const;
const BREAK_OPTIONS = [5, 10, 15] as const;
const HARD_PERIOD_OPTIONS: Array<{ value: HardSubjectsPeriodPreference; label: string; desc: string }> = [
  { value: 'morning', label: 'Manha', desc: 'Materias dificeis nos blocos da manha' },
  { value: 'afternoon', label: 'Tarde', desc: 'Materias dificeis nos blocos da tarde' },
  { value: 'night', label: 'Noite', desc: 'Materias dificeis nos blocos da noite' },
  { value: 'any', label: 'Tanto faz', desc: 'Sem preferencia de periodo' },
];
const STUDY_STYLE_OPTIONS: Array<{ value: StudyStylePreference; label: string; desc: string }> = [
  { value: 'theory', label: 'Mais teoria', desc: 'Maior proporcao de blocos AULA' },
  { value: 'practice', label: 'Mais exercicios', desc: 'Maior proporcao de blocos EXERCICIOS' },
  { value: 'balanced', label: 'Equilibrado', desc: 'Mix padrao com teoria e exercicios' },
];
const QUICK_HOURS = [2, 3, 4, 5, 6] as const;
const SETTINGS_SECTION_CLASS =
  'rounded-[22px] border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';
const SETTINGS_ROW_CLASS =
  'w-full rounded-2xl border border-white/10 bg-[#1a1d28]/85 px-3 py-3 text-left transition-colors';

const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = { hidden: { opacity: 0, y: 24, scale: 0.99 }, visible: { opacity: 1, y: 0, scale: 1 } };

const clampHours = (v: number) => Math.min(12, Math.max(0, Math.round(v * 2) / 2));
const clampHoursPrecise = (v: number) => Math.min(12, Math.max(0, Math.round(v * 100) / 100));
const toDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDate = (k?: string) => {
  if (!k) return 'Nao definido';
  const d = new Date(`${k}T00:00:00`);
  if (Number.isNaN(d.getTime())) return k;
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};
const fmtHours = (v: number) => {
  const n = Math.max(0, v);
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};
const isValidWindow = (start: string, end: string) => Boolean(start && end && timeToMinutes(end) > timeToMinutes(start));
const windowHours = (start: string, end: string) => {
  if (!isValidWindow(start, end)) return null;
  const diff = (timeToMinutes(end) - timeToMinutes(start)) / 60;
  return clampHoursPrecise(diff);
};
const minutesToClock = (totalMinutes: number) => {
  const clamped = Math.max(0, Math.min((23 * 60) + 59, Math.round(totalMinutes)));
  const hh = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
const addMinutesToClock = (start: string, durationMinutes: number) => minutesToClock(timeToMinutes(start) + durationMinutes);
const buildMassWindowSuggestions = (hours: number) => {
  const durationMinutes = Math.max(60, Math.round(hours * 60));
  const base = [
    { id: 'morning', label: 'Manha', start: '08:00' },
    { id: 'afternoon', label: 'Tarde', start: '13:30' },
    { id: 'night', label: 'Noite', start: '19:00' },
  ] as const;
  return base.map((slot) => ({
    id: slot.id,
    label: slot.label,
    start: slot.start,
    end: addMinutesToClock(slot.start, durationMinutes),
  }));
};

const emptyAvailability = (): DailyAvailabilityByWeekday => ({
  dom: { start: '', end: '' },
  seg: { start: '', end: '' },
  ter: { start: '', end: '' },
  qua: { start: '', end: '' },
  qui: { start: '', end: '' },
  sex: { start: '', end: '' },
  sab: { start: '', end: '' },
});

const defaultDailyHours = (goal: PresetWizardAnswers['goal']): DailyHoursByWeekday => {
  if (goal === 'medicina') return { dom: 0, seg: 5, ter: 5, qua: 5, qui: 5, sex: 5, sab: 3 };
  if (goal === 'enem' || goal === 'concurso') return { dom: 0, seg: 4, ter: 4, qua: 4, qui: 4, sex: 4, sab: 2 };
  return { dom: 0, seg: 3, ter: 3, qua: 3, qui: 3, sex: 3, sab: 2 };
};

const resolveGoal = (presetId: string, presetName: string): PresetWizardAnswers['goal'] => {
  const s = `${presetId} ${presetName}`.toLowerCase();
  if (s.includes('enem')) return 'enem';
  if (s.includes('med')) return 'medicina';
  if (s.includes('conc')) return 'concurso';
  return 'outros';
};

const mapStudyStyleToContentPref = (style: StudyStylePreference): NonNullable<PresetWizardAnswers['studyContentPreference']> => {
  if (style === 'theory') return 'aulas';
  if (style === 'practice') return 'exercicios';
  return 'misto';
};

const buildDefaultAnswers = (presetId: string, presetName: string): PresetWizardAnswers => {
  const goal = resolveGoal(presetId, presetName);
  const focus = goal === 'medicina' ? 60 : 50;
  return {
    goal,
    dailyHoursByWeekday: defaultDailyHours(goal),
    dailyAvailabilityByWeekday: emptyAvailability(),
    focusMinutes: focus,
    focusBlockMinutes: focus,
    breakMinutes: 10,
    hardSubjectsPeriodPreference: 'any',
    studyStyle: 'balanced',
    studyContentPreference: 'misto',
    startDate: toDateKey(new Date()),
    examDate: '',
  };
};

export default function PresetConfigWizard({ isOpen, presetId, presetName, baseSettings, onClose, onApply }: PresetConfigWizardProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<PresetWizardAnswers>(() => buildDefaultAnswers(presetId, presetName));
  const [error, setError] = useState<string | null>(null);
  const [massHours, setMassHours] = useState(4);
  const [massDays, setMassDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [massStart, setMassStart] = useState('');
  const [massEnd, setMassEnd] = useState('');
  const [hasExamDate, setHasExamDate] = useState(false);
  const [showMassAdvanced, setShowMassAdvanced] = useState(false);
  const [showDayWindows, setShowDayWindows] = useState(false);

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!isOpen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const next = buildDefaultAnswers(presetId, presetName);
    setAnswers(next);
    setStep(0);
    setError(null);
    setMassHours(4);
    setMassDays([1, 2, 3, 4, 5]);
    setMassStart('');
    setMassEnd('');
    setHasExamDate(Boolean(next.examDate));
    setShowMassAdvanced(false);
    setShowDayWindows(false);
  }, [isOpen, presetId, presetName]);

  const summary = useMemo(() => computeStudyPreferences(baseSettings, answers), [baseSettings, answers]);
  const progress = Math.round(((step + 1) / STEP_TITLES.length) * 100);
  const activeDays = useMemo(() => DAY_OPTIONS.filter((d) => (answers.dailyHoursByWeekday[d.key] || 0) > 0), [answers.dailyHoursByWeekday]);
  const weeklyHours = useMemo(() => Object.values(answers.dailyHoursByWeekday).reduce((sum, h) => sum + (h || 0), 0), [answers.dailyHoursByWeekday]);
  const blocksPerDay = useMemo(() => {
    const cycle = (answers.focusBlockMinutes || answers.focusMinutes) + answers.breakMinutes;
    const res: Record<WeekdayKey, number> = { dom: 0, seg: 0, ter: 0, qua: 0, qui: 0, sex: 0, sab: 0 };
    DAY_OPTIONS.forEach((d) => {
      const h = answers.dailyHoursByWeekday[d.key] || 0;
      if (h <= 0) return;
      res[d.key] = Math.max(1, Math.floor(((h * 60) + answers.breakMinutes) / cycle));
    });
    return res;
  }, [answers.breakMinutes, answers.dailyHoursByWeekday, answers.focusBlockMinutes, answers.focusMinutes]);
  const weeklyBlocks = useMemo(() => Object.values(blocksPerDay).reduce((sum, n) => sum + n, 0), [blocksPerDay]);
  const massWindowSuggestions = useMemo(() => buildMassWindowSuggestions(massHours), [massHours]);
  const primaryMassSuggestion = massWindowSuggestions[0];

  const resetAndClose = () => {
    setStep(0);
    setError(null);
    setAnswers(buildDefaultAnswers(presetId, presetName));
    onClose();
  };

  const patchAnswers = (patch: Partial<PresetWizardAnswers>) => setAnswers((prev) => ({ ...prev, ...patch }));
  const applySuggestedMassWindow = (start: string, end: string) => {
    setMassStart(start);
    setMassEnd(end);
  };
  const toggleMassAdvanced = () => {
    if (!showMassAdvanced && !massStart && !massEnd) {
      applySuggestedMassWindow(primaryMassSuggestion.start, primaryMassSuggestion.end);
    }
    setShowMassAdvanced((prev) => !prev);
  };
  const toggleMassDay = (value: number) => setMassDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
  const toggleDayActive = (value: number) => {
    const day = DAY_OPTIONS.find((d) => d.value === value);
    if (!day) return;
    setAnswers((prev) => {
      const currentHours = prev.dailyHoursByWeekday[day.key] || 0;
      const nextHours = { ...prev.dailyHoursByWeekday };
      const nextWindows = { ...prev.dailyAvailabilityByWeekday };
      if (currentHours > 0) {
        nextHours[day.key] = 0;
        nextWindows[day.key] = { start: '', end: '' };
      } else {
        nextHours[day.key] = clampHours(massHours || 2);
      }
      return { ...prev, dailyHoursByWeekday: nextHours, dailyAvailabilityByWeekday: nextWindows };
    });
  };
  const updateDayHours = (key: WeekdayKey, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      dailyHoursByWeekday: {
        ...prev.dailyHoursByWeekday,
        [key]: clampHours(Number.isFinite(value) ? value : 0),
      },
    }));
  };
  const updateDayWindow = (key: WeekdayKey, field: 'start' | 'end', value: string) => {
    setAnswers((prev) => {
      const nextWindows = {
        ...prev.dailyAvailabilityByWeekday,
        [key]: {
          ...prev.dailyAvailabilityByWeekday[key],
          [field]: value,
        },
      };
      const nextHours = { ...prev.dailyHoursByWeekday };
      const autoHours = windowHours(nextWindows[key].start, nextWindows[key].end);
      if (autoHours !== null) nextHours[key] = autoHours;
      return {
        ...prev,
        dailyAvailabilityByWeekday: nextWindows,
        dailyHoursByWeekday: nextHours,
      };
    });
  };
  const applyMassSchedule = () => {
    if (massDays.length === 0) return;
    setAnswers((prev) => {
      const nextWindows = { ...prev.dailyAvailabilityByWeekday };
      const nextHours = { ...prev.dailyHoursByWeekday };
      const autoHours = windowHours(massStart, massEnd);
      massDays.forEach((value) => {
        const day = DAY_OPTIONS.find((d) => d.value === value);
        if (!day) return;
        nextHours[day.key] = autoHours ?? clampHours(massHours);
        if (massStart || massEnd) {
          nextWindows[day.key] = { start: massStart, end: massEnd };
        }
      });
      return { ...prev, dailyAvailabilityByWeekday: nextWindows, dailyHoursByWeekday: nextHours };
    });
  };
  const validateStep0 = () => {
    if (activeDays.length === 0) return 'Defina pelo menos um dia com horas liquidas > 0.';
    for (const day of DAY_OPTIONS) {
      const hours = answers.dailyHoursByWeekday[day.key] || 0;
      const window = answers.dailyAvailabilityByWeekday[day.key];
      if (!(window.start || window.end)) continue;
      if (!window.start || !window.end) return `${day.label}: preencha inicio e fim ou limpe a janela.`;
      if (!isValidWindow(window.start, window.end)) return `${day.label}: horario invalido.`;
      if (hours > 0) {
        const maxHours = (timeToMinutes(window.end) - timeToMinutes(window.start)) / 60;
        if (hours > maxHours + 0.01) return `${day.label}: horas liquidas excedem a janela do dia.`;
      }
    }
    return null;
  };
  const validateStep4 = () => {
    if (!hasExamDate) return null;
    if (!answers.examDate) return 'Selecione a data da prova ou marque que ainda nao tem data.';
    if (answers.examDate < todayKey) return 'A data da prova precisa ser hoje ou futura.';
    return null;
  };
  const next = () => {
    setError(null);
    const err = step === 0 ? validateStep0() : step === 4 ? validateStep4() : null;
    if (err) return setError(err);
    setStep((s) => Math.min(STEP_TITLES.length - 1, s + 1));
  };
  const apply = () => {
    setError(null);
    const err = validateStep0() || validateStep4();
    if (err) return setError(err);
    onApply(summary.settings, summary.studyPrefs, { ...answers, examDate: hasExamDate ? answers.examDate : '' });
    resetAndClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[10000] grid place-items-start overflow-y-auto overscroll-contain bg-black/70 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[calc(0.75rem+max(env(safe-area-inset-top),0px))] pb-[calc(0.75rem+max(env(safe-area-inset-bottom),0px))] backdrop-blur-sm sm:place-items-center sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))]"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="w-full min-h-0 max-w-4xl max-h-[calc(100dvh-1.5rem-max(env(safe-area-inset-top),0px)-max(env(safe-area-inset-bottom),0px))]"
        >
          <Card className="flex min-h-0 max-h-full flex-col overflow-hidden rounded-2xl border-white/10 bg-[#0b0e17]/95 p-2.5 sm:p-5 md:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-neon-cyan sm:text-sm">Configuracao do cronograma</p>
                <h2 className="text-xl font-heading font-bold text-white sm:text-2xl">{presetName}</h2>
                <p className="mt-1 text-xs text-text-secondary sm:text-sm">Fluxo curto: cada resposta altera a geracao do cronograma.</p>
              </div>
              <Button variant="ghost" className="h-9 min-h-0 px-3 text-xs sm:h-10 sm:text-sm" onClick={resetAndClose}>Fechar</Button>
            </div>

            <div className="mt-3 sm:mt-4">
              <ProgressBar value={progress} label={`${progress}%`} />
              <div className="mt-2 grid gap-2 text-center text-[11px] text-text-muted" style={{ gridTemplateColumns: `repeat(${STEP_TITLES.length}, minmax(0, 1fr))` }}>
                {STEP_TITLES.map((title, idx) => (
                  <span key={title} className={cn(idx === step ? 'text-white' : 'text-text-muted')}>
                    <span className="inline sm:hidden">{STEP_TITLES_SHORT[idx]}</span>
                    <span className="hidden sm:inline">{title}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 flex-1 min-h-0 overflow-y-auto scroll-touch px-0.5 sm:px-1.5 pb-3 sm:pb-6 space-y-4 sm:space-y-6">
              {step === 0 && (
                <>
                  <Card className={cn(SETTINGS_SECTION_CLASS, 'overflow-hidden p-0')}>
                    <div className="border-b border-white/10 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">Aplicar em massa</p>
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-text-secondary hover:text-white"
                          onClick={toggleMassAdvanced}
                        >
                          {showMassAdvanced ? 'Ocultar avancado' : 'Avancado'}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-text-muted">Escolha horas e dias, depois aplique.</p>
                    </div>

                    <div className="space-y-3 p-3">
                      <div className="flex flex-wrap gap-2">
                        {QUICK_HOURS.map((h) => (
                          <button
                            key={h}
                            type="button"
                            className={cn(
                              'rounded-xl border px-3 py-1.5 text-xs transition-colors',
                              massHours === h
                                ? 'border-neon-cyan/60 bg-neon-cyan/10 text-white'
                                : 'border-white/10 text-text-secondary hover:text-white'
                            )}
                            onClick={() => setMassHours(h)}
                          >
                            {h}h
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {DAY_OPTIONS.map((d) => (
                          <button
                            key={d.key}
                            type="button"
                            className={cn(
                              'rounded-xl border px-3 py-1.5 text-xs transition-colors',
                              massDays.includes(d.value)
                                ? 'border-neon-purple/60 bg-neon-purple/15 text-white'
                                : 'border-white/10 text-text-secondary hover:text-white'
                            )}
                            onClick={() => toggleMassDay(d.value)}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>

                      <div>
                        <Button
                          variant="secondary"
                          className="h-9 min-h-0 w-full rounded-xl px-3 text-xs sm:h-10 sm:text-sm"
                          onClick={applyMassSchedule}
                          disabled={massDays.length === 0}
                        >
                          Aplicar horario
                        </Button>
                      </div>

                      {showMassAdvanced && (
                        <div className="space-y-2 rounded-xl border border-white/10 bg-[#171a25]/80 p-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="time"
                              value={massStart}
                              onChange={(e) => setMassStart(e.target.value)}
                              className="input-field h-9 min-h-0 text-sm sm:h-10"
                            />
                            <input
                              type="time"
                              value={massEnd}
                              onChange={(e) => setMassEnd(e.target.value)}
                              className="input-field h-9 min-h-0 text-sm sm:h-10"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {massWindowSuggestions.map((slot) => (
                              <button
                                key={slot.id}
                                type="button"
                                className={cn(
                                  'rounded-xl border px-2.5 py-1 text-[11px] transition-colors',
                                  massStart === slot.start && massEnd === slot.end
                                    ? 'border-neon-cyan/60 bg-neon-cyan/10 text-white'
                                    : 'border-white/10 text-text-secondary hover:text-white'
                                )}
                                onClick={() => applySuggestedMassWindow(slot.start, slot.end)}
                              >
                                {slot.label} {slot.start}-{slot.end}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className={cn(SETTINGS_SECTION_CLASS, 'overflow-hidden p-0')}>
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                      <p className="text-sm font-semibold text-white">Disponibilidade por dia</p>
                      <button
                        type="button"
                        className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-text-secondary hover:text-white"
                        onClick={() => setShowDayWindows((prev) => !prev)}
                      >
                        {showDayWindows ? 'Ocultar horarios' : 'Mostrar horarios'}
                      </button>
                    </div>

                    <div className="divide-y divide-white/10">
                      {DAY_OPTIONS.map((d) => {
                        const hours = answers.dailyHoursByWeekday[d.key] || 0;
                        const active = hours > 0;
                        const w = answers.dailyAvailabilityByWeekday[d.key];
                        return (
                          <div key={d.key} className="px-3 py-2.5">
                            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleDayActive(d.value)}
                                className={cn(
                                  'h-8 rounded-lg border px-2.5 text-[11px] sm:h-9 sm:text-xs',
                                  active
                                    ? 'border-neon-cyan/60 text-white'
                                    : 'border-white/10 text-text-muted'
                                )}
                              >
                                {d.label}
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={12}
                                step={0.5}
                                disabled={!active}
                                value={hours}
                                onChange={(e) => updateDayHours(d.key, Number(e.target.value))}
                                className={cn('input-field h-8 min-h-0 text-sm sm:h-9', !active && 'opacity-60')}
                              />
                              <button
                                type="button"
                                className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-text-secondary hover:text-white"
                                onClick={() => {
                                  updateDayHours(d.key, 0);
                                  updateDayWindow(d.key, 'start', '');
                                  updateDayWindow(d.key, 'end', '');
                                }}
                              >
                                Limpar
                              </button>
                            </div>

                            {showDayWindows && active && (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <input
                                  type="time"
                                  value={w.start}
                                  onChange={(e) => updateDayWindow(d.key, 'start', e.target.value)}
                                  className="input-field h-8 min-h-0 text-sm sm:h-9"
                                />
                                <input
                                  type="time"
                                  value={w.end}
                                  onChange={(e) => updateDayWindow(d.key, 'end', e.target.value)}
                                  className="input-field h-8 min-h-0 text-sm sm:h-9"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </>
              )}

              {step === 1 && (
                <>
                  <Card className={cn(SETTINGS_SECTION_CLASS, 'p-3 sm:p-4')}>
                    <p className="mb-2 text-sm font-semibold text-white">Duracao do bloco de foco (minutos)</p>
                    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                      {FOCUS_OPTIONS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          className={cn(
                            'rounded-xl border px-3 py-2 text-xs sm:text-sm',
                            (answers.focusBlockMinutes || answers.focusMinutes) === v
                              ? 'border-neon-cyan/60 bg-neon-cyan/10 text-white'
                              : 'border-white/10 text-text-secondary'
                          )}
                          onClick={() => patchAnswers({ focusMinutes: v, focusBlockMinutes: v })}
                        >
                          {v} min
                        </button>
                      ))}
                    </div>
                  </Card>
                  <Card className={cn(SETTINGS_SECTION_CLASS, 'p-3 sm:p-4')}>
                    <p className="mb-2 text-sm font-semibold text-white">Tempo de pausa (minutos)</p>
                    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                      {BREAK_OPTIONS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          className={cn(
                            'rounded-xl border px-3 py-2 text-xs sm:text-sm',
                            answers.breakMinutes === v
                              ? 'border-neon-purple/60 bg-neon-purple/10 text-white'
                              : 'border-white/10 text-text-secondary'
                          )}
                          onClick={() => patchAnswers({ breakMinutes: v })}
                        >
                          {v} min
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-text-muted">A engine usara exatamente foco = bloco e pausa = intervalo.</p>
                  </Card>
                </>
              )}

              {step === 2 && (
                <Card className={cn(SETTINGS_SECTION_CLASS, 'p-3 sm:p-4')}>
                  <p className="mb-2 text-sm font-semibold text-white">Em qual periodo voce prefere estudar materias dificeis?</p>
                  <div className="space-y-2">
                    {HARD_PERIOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={cn(
                          SETTINGS_ROW_CLASS,
                          (answers.hardSubjectsPeriodPreference || 'any') === opt.value
                            ? 'border-neon-blue/60 bg-neon-blue/10 text-white'
                            : 'text-text-secondary hover:text-white'
                        )}
                        onClick={() => patchAnswers({ hardSubjectsPeriodPreference: opt.value })}
                      >
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="mt-0.5 text-xs opacity-80">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {step === 3 && (
                <Card className={cn(SETTINGS_SECTION_CLASS, 'p-3 sm:p-4')}>
                  <p className="mb-2 text-sm font-semibold text-white">Qual estilo voce prefere?</p>
                  <div className="space-y-2">
                    {STUDY_STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={cn(
                          SETTINGS_ROW_CLASS,
                          (answers.studyStyle || 'balanced') === opt.value
                            ? 'border-neon-cyan/60 bg-neon-cyan/10 text-white'
                            : 'text-text-secondary hover:text-white'
                        )}
                        onClick={() =>
                          patchAnswers({
                            studyStyle: opt.value,
                            studyContentPreference: mapStudyStyleToContentPref(opt.value),
                          })
                        }
                      >
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="mt-0.5 text-xs opacity-80">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-text-muted">
                    Revisoes e simulados continuam automaticos; esta escolha ajusta o mix entre aula e exercicios.
                  </p>
                </Card>
              )}

              {step === 4 && (
                <>
                  <Card className={cn(SETTINGS_SECTION_CLASS, 'space-y-4 p-3 sm:p-4')}>
                    <div className="flex items-start gap-3">
                      <Calendar className="mt-0.5 h-5 w-5 text-neon-blue" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">Data da prova (opcional)</p>
                        <p className="text-xs text-text-muted">
                          Se informada, a engine ajusta intensidade e entra em fase final automaticamente.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        className={cn(
                          SETTINGS_ROW_CLASS,
                          hasExamDate
                            ? 'text-text-secondary hover:text-white'
                            : 'border-neon-cyan/60 bg-neon-cyan/10 text-white'
                        )}
                        onClick={() => {
                          setHasExamDate(false);
                          patchAnswers({ examDate: '' });
                        }}
                      >
                        Ainda nao tenho data
                      </button>
                      <button
                        type="button"
                        className={cn(
                          SETTINGS_ROW_CLASS,
                          hasExamDate
                            ? 'border-neon-cyan/60 bg-neon-cyan/10 text-white'
                            : 'text-text-secondary hover:text-white'
                        )}
                        onClick={() => {
                          setHasExamDate(true);
                          if (!answers.examDate || answers.examDate < todayKey) patchAnswers({ examDate: todayKey });
                        }}
                      >
                        Tenho data da prova
                      </button>
                    </div>

                    {hasExamDate && (
                      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 md:items-end">
                        <div>
                          <label className="block text-xs text-text-muted mb-1">Data da prova</label>
                          <input
                            type="date"
                            min={todayKey}
                            value={answers.examDate || ''}
                            onChange={(e) => patchAnswers({ examDate: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div className="text-xs text-text-secondary">
                          A intensidade sera ajustada automaticamente ao salvar.
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 md:items-end">
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Quando deseja iniciar</label>
                        <input
                          type="date"
                          min={todayKey}
                          value={answers.startDate || todayKey}
                          onChange={(e) => patchAnswers({ startDate: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div className="text-xs text-text-secondary">
                        O cronograma sera regenerado para a semana iniciando em {fmtDate(answers.startDate || todayKey)}.
                      </div>
                    </div>
                  </Card>

                  <Card className={cn(SETTINGS_SECTION_CLASS, 'space-y-4 p-3 sm:p-4')}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-neon-cyan" />
                      <p className="text-sm font-semibold text-white">Resumo da configuracao</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                        <p className="text-xs text-text-muted">Horas semanais</p>
                        <p className="text-xl font-semibold text-white">{fmtHours(weeklyHours)}</p>
                        <p className="text-xs text-text-secondary mt-1">{activeDays.length} dia(s) ativo(s)</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                        <p className="text-xs text-text-muted">Blocos e pausa</p>
                        <p className="text-xl font-semibold text-white flex items-center gap-2">
                          <Clock className="h-4 w-4 text-neon-purple" />
                          {answers.focusBlockMinutes || answers.focusMinutes} / {answers.breakMinutes} min
                        </p>
                        <p className="text-xs text-text-secondary mt-1">{weeklyBlocks} bloco(s) na semana</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-neon-blue" />
                        <p className="text-sm font-medium text-white">Previsao de progresso</p>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">
                        {(() => {
                          const intensity = summary.studyPrefs.intensity || 'normal';
                          const style = answers.studyStyle || 'balanced';
                          const exam = hasExamDate && answers.examDate ? `Prova em ${fmtDate(answers.examDate)}. ` : '';
                          const base =
                            weeklyHours >= 25
                              ? 'ritmo alto com cobertura e revisoes frequentes'
                              : weeklyHours >= 12
                              ? 'ritmo consistente com boa progressao semanal'
                              : 'ritmo leve; a progressao sera mais gradual';
                          const styleText =
                            style === 'theory'
                              ? 'foco maior em aulas'
                              : style === 'practice'
                              ? 'foco maior em exercicios'
                              : 'mix equilibrado entre teoria e pratica';
                          const intensityText =
                            intensity === 'intensa'
                              ? 'fase final intensificada'
                              : intensity === 'leve'
                              ? 'fase de base/medio prazo'
                              : 'fase de consolidacao progressiva';
                          return `${exam}${base}, com ${styleText} e ${intensityText}.`;
                        })()}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                      <p className="text-xs text-text-muted mb-2">Blocos por dia (estimativa)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {DAY_OPTIONS.map((d) => (
                          <div key={d.key} className="rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-2 text-center">
                            <div className="text-[11px] text-text-muted">{d.label}</div>
                            <div className="text-sm font-medium text-white">{blocksPerDay[d.key] || 0}</div>
                            <div className="text-[11px] text-text-secondary">
                              {(answers.dailyHoursByWeekday[d.key] || 0) > 0 ? fmtHours(answers.dailyHoursByWeekday[d.key] || 0) : 'Sem estudo'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-3 flex flex-col-reverse gap-2 border-t border-slate-800/70 pt-2.5 pb-[max(0px,env(safe-area-inset-bottom))] sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-3">
              <div className="text-[11px] text-text-muted sm:text-xs">Todas as respostas desta tela alteram a geracao do cronograma.</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="ghost" className="h-9 min-h-0 px-3 text-xs sm:h-10 sm:text-sm" onClick={resetAndClose}>Cancelar</Button>
                <Button
                  variant="secondary"
                  className="h-9 min-h-0 px-3 text-xs sm:h-10 sm:text-sm"
                  onClick={() => {
                    setError(null);
                    setStep((s) => Math.max(0, s - 1));
                  }}
                  disabled={step === 0}
                >
                  Voltar
                </Button>
                {step < STEP_TITLES.length - 1 ? (
                  <Button variant="primary" className="h-9 min-h-0 px-3 text-xs sm:h-10 sm:text-sm" onClick={next}>Proximo</Button>
                ) : (
                  <Button variant="primary" className="h-9 min-h-0 px-3 text-xs sm:h-10 sm:text-sm" onClick={apply}>Salvar e regenerar cronograma</Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
