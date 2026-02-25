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

const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = { hidden: { opacity: 0, y: 24, scale: 0.99 }, visible: { opacity: 1, y: 0, scale: 1 } };

const clampHours = (v: number) => Math.min(12, Math.max(0, Math.round(v * 2) / 2));
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

  const resetAndClose = () => {
    setStep(0);
    setError(null);
    setAnswers(buildDefaultAnswers(presetId, presetName));
    onClose();
  };

  const patchAnswers = (patch: Partial<PresetWizardAnswers>) => setAnswers((prev) => ({ ...prev, ...patch }));
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
    setAnswers((prev) => ({
      ...prev,
      dailyAvailabilityByWeekday: {
        ...prev.dailyAvailabilityByWeekday,
        [key]: {
          ...prev.dailyAvailabilityByWeekday[key],
          [field]: value,
        },
      },
    }));
  };
  const applyMassHours = () => {
    if (massDays.length === 0) return;
    setAnswers((prev) => {
      const next = { ...prev.dailyHoursByWeekday };
      massDays.forEach((value) => {
        const day = DAY_OPTIONS.find((d) => d.value === value);
        if (!day) return;
        next[day.key] = clampHours(massHours);
      });
      return { ...prev, dailyHoursByWeekday: next };
    });
  };
  const applyMassWindow = () => {
    if (massDays.length === 0) return;
    setAnswers((prev) => {
      const next = { ...prev.dailyAvailabilityByWeekday };
      massDays.forEach((value) => {
        const day = DAY_OPTIONS.find((d) => d.value === value);
        if (!day) return;
        next[day.key] = { start: massStart, end: massEnd };
      });
      return { ...prev, dailyAvailabilityByWeekday: next };
    });
  };
  const copyMondayToSelected = () => {
    setAnswers((prev) => {
      const segHours = prev.dailyHoursByWeekday.seg;
      const segWindow = prev.dailyAvailabilityByWeekday.seg;
      const hours = { ...prev.dailyHoursByWeekday };
      const windows = { ...prev.dailyAvailabilityByWeekday };
      massDays.forEach((value) => {
        const day = DAY_OPTIONS.find((d) => d.value === value);
        if (!day || day.key === 'seg') return;
        hours[day.key] = segHours;
        windows[day.key] = { ...segWindow };
      });
      return { ...prev, dailyHoursByWeekday: hours, dailyAvailabilityByWeekday: windows };
    });
  };
  const applyMonToFri = () => {
    setMassDays([1, 2, 3, 4, 5]);
    setAnswers((prev) => {
      const hours = { ...prev.dailyHoursByWeekday };
      const windows = { ...prev.dailyAvailabilityByWeekday };
      ['seg', 'ter', 'qua', 'qui', 'sex'].forEach((key) => {
        const k = key as WeekdayKey;
        hours[k] = clampHours(massHours);
        if (massStart || massEnd) {
          windows[k] = { start: massStart, end: massEnd };
        }
      });
      return { ...prev, dailyHoursByWeekday: hours, dailyAvailabilityByWeekday: windows };
    });
  };
  const applyToAll = () => {
    setMassDays([0, 1, 2, 3, 4, 5, 6]);
    setAnswers((prev) => {
      const hours = { ...prev.dailyHoursByWeekday };
      const windows = { ...prev.dailyAvailabilityByWeekday };
      DAY_OPTIONS.forEach((d) => {
        hours[d.key] = clampHours(massHours);
        if (massStart || massEnd) {
          windows[d.key] = { start: massStart, end: massEnd };
        }
      });
      return { ...prev, dailyHoursByWeekday: hours, dailyAvailabilityByWeekday: windows };
    });
  };
  const clearMassSelectionValues = () => {
    if (massDays.length === 0) return;
    setAnswers((prev) => {
      const hours = { ...prev.dailyHoursByWeekday };
      const windows = { ...prev.dailyAvailabilityByWeekday };
      massDays.forEach((value) => {
        const day = DAY_OPTIONS.find((d) => d.value === value);
        if (!day) return;
        hours[day.key] = 0;
        windows[day.key] = { start: '', end: '' };
      });
      return { ...prev, dailyHoursByWeekday: hours, dailyAvailabilityByWeekday: windows };
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
      <motion.div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/70 px-2 py-4 backdrop-blur-sm sm:px-4 md:items-center" variants={overlayVariants} initial="hidden" animate="visible" exit="hidden">
        <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="hidden" className="w-full md:max-w-4xl md:max-h-[88vh] max-h-[calc(100dvh-2rem)]">
          <Card className="flex h-[calc(100dvh-2rem)] md:h-auto md:max-h-[88vh] min-h-0 flex-col overflow-hidden rounded-none md:rounded-2xl border-slate-800 bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-slate-900/95 p-4 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-neon-cyan">Configuracao do cronograma</p>
                <h2 className="text-2xl font-heading font-bold text-white">{presetName}</h2>
                <p className="mt-1 text-sm text-text-secondary">Fluxo curto: cada resposta altera a geracao do cronograma.</p>
              </div>
              <Button variant="ghost" onClick={resetAndClose}>Fechar</Button>
            </div>

            <div className="mt-4">
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

            <div className="mt-6 flex-1 min-h-0 overflow-y-auto px-1 sm:px-2 pb-6 space-y-6">
              {step === 0 && (
                <>
                  <Card className="border-slate-800 bg-slate-900/40 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Aplicar em massa</p>
                        <p className="text-xs text-text-muted">
                          Selecione os dias alvo do lote (isso sozinho nao altera o cronograma).
                        </p>
                      </div>
                      <div className="text-sm text-white">Padrao: {fmtHours(massHours)}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-text-muted">Dias selecionados para o lote: {massDays.length}</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-text-secondary"
                          onClick={() => setMassDays(DAY_OPTIONS.map((d) => d.value))}
                        >
                          Selecionar todos
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-text-secondary"
                          onClick={() => setMassDays([])}
                        >
                          Limpar selecao
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">{DAY_OPTIONS.map((d) => <button key={d.key} type="button" className={cn('px-3 py-2 rounded-lg border text-sm', massDays.includes(d.value) ? 'border-neon-purple bg-neon-purple/20 text-white' : 'border-slate-800 text-text-secondary')} onClick={() => toggleMassDay(d.value)}>{d.label}</button>)}</div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3 md:items-end">
                      <input type="range" min={0} max={12} step={0.5} value={massHours} onChange={(e) => setMassHours(clampHours(Number(e.target.value)))} className="w-full accent-neon-cyan" />
                      <input type="number" min={0} max={12} step={0.5} value={massHours} onChange={(e) => setMassHours(clampHours(Number(e.target.value)))} className="input-field" />
                      <Button variant="secondary" onClick={applyMassHours} disabled={massDays.length === 0}>Aplicar horas</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 md:items-end">
                      <input type="time" value={massStart} onChange={(e) => setMassStart(e.target.value)} className="input-field" />
                      <input type="time" value={massEnd} onChange={(e) => setMassEnd(e.target.value)} className="input-field" />
                      <Button variant="ghost" onClick={applyMassWindow} disabled={massDays.length === 0}>Aplicar horario</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">{QUICK_HOURS.map((h) => <button key={h} type="button" className={cn('px-3 py-2 rounded-lg border text-sm', massHours === h ? 'border-neon-cyan bg-neon-cyan/10 text-white' : 'border-slate-800 text-text-secondary')} onClick={() => setMassHours(h)}>{h}h</button>)}</div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={copyMondayToSelected}>Copiar segunda para selecionados</Button>
                      <Button variant="secondary" onClick={applyMonToFri}>Aplicar lote seg-sex</Button>
                      <Button variant="secondary" onClick={applyToAll}>Aplicar lote para todos</Button>
                      <Button variant="ghost" onClick={clearMassSelectionValues}>Limpar selecionados</Button>
                    </div>
                  </Card>

                  <Card className="border-slate-800 bg-slate-900/30 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3"><p className="text-white font-semibold text-sm">Disponibilidade por dia</p><p className="text-xs text-text-muted">0h = sem estudo | horario opcional</p></div>
                    {DAY_OPTIONS.map((d) => {
                      const hours = answers.dailyHoursByWeekday[d.key] || 0;
                      const active = hours > 0;
                      const w = answers.dailyAvailabilityByWeekday[d.key];
                      return (
                        <div key={d.key} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                          <div className="grid grid-cols-1 lg:grid-cols-[auto_90px_1fr_1fr] gap-3 lg:items-end">
                            <button type="button" onClick={() => toggleDayActive(d.value)} className={cn('h-10 rounded-lg border px-3 text-sm', active ? 'border-neon-cyan/60 text-white' : 'border-slate-800 text-text-muted')}>
                              {d.label} {active ? '· Estudo' : '· Sem estudo'}
                            </button>
                            <input type="number" min={0} max={12} step={0.5} disabled={!active} value={hours} onChange={(e) => updateDayHours(d.key, Number(e.target.value))} className={cn('input-field h-10', !active && 'opacity-60')} />
                            <input type="time" disabled={!active} value={w.start} onChange={(e) => updateDayWindow(d.key, 'start', e.target.value)} className={cn('input-field h-10', !active && 'opacity-60')} />
                            <input type="time" disabled={!active} value={w.end} onChange={(e) => updateDayWindow(d.key, 'end', e.target.value)} className={cn('input-field h-10', !active && 'opacity-60')} />
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                            <span className={cn(active ? 'text-text-secondary' : 'text-text-muted')}>
                              {active ? `Horas liquidas: ${fmtHours(hours)}` : 'Sem estudo neste dia'}
                            </span>
                            <button
                              type="button"
                              className="rounded-md border border-slate-700 px-2 py-1 text-text-secondary hover:text-white"
                              onClick={() => {
                                updateDayHours(d.key, 0);
                                updateDayWindow(d.key, 'start', '');
                                updateDayWindow(d.key, 'end', '');
                              }}
                            >
                              Marcar sem estudo
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                </>
              )}

              {step === 1 && (
                <>
                  <Card className="border-slate-800 bg-slate-900/40 p-4">
                    <p className="text-sm font-semibold text-white mb-3">Duracao do bloco de foco (minutos)</p>
                    <div className="flex flex-wrap gap-2">{FOCUS_OPTIONS.map((v) => <button key={v} type="button" className={cn('px-4 py-2 rounded-lg border text-sm', (answers.focusBlockMinutes || answers.focusMinutes) === v ? 'border-neon-cyan bg-neon-cyan/10 text-white' : 'border-slate-800 text-text-secondary')} onClick={() => patchAnswers({ focusMinutes: v, focusBlockMinutes: v })}>{v} min</button>)}</div>
                  </Card>
                  <Card className="border-slate-800 bg-slate-900/40 p-4">
                    <p className="text-sm font-semibold text-white mb-3">Tempo de pausa (minutos)</p>
                    <div className="flex flex-wrap gap-2">{BREAK_OPTIONS.map((v) => <button key={v} type="button" className={cn('px-4 py-2 rounded-lg border text-sm', answers.breakMinutes === v ? 'border-neon-purple bg-neon-purple/10 text-white' : 'border-slate-800 text-text-secondary')} onClick={() => patchAnswers({ breakMinutes: v })}>{v} min</button>)}</div>
                    <p className="mt-2 text-xs text-text-muted">A engine usara exatamente foco = bloco e pausa = intervalo.</p>
                  </Card>
                </>
              )}

              {step === 2 && (
                <Card className="border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-sm font-semibold text-white mb-3">Em qual periodo voce prefere estudar materias dificeis?</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {HARD_PERIOD_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button" className={cn('rounded-xl border px-3 py-3 text-left', (answers.hardSubjectsPeriodPreference || 'any') === opt.value ? 'border-neon-blue bg-neon-blue/10 text-white' : 'border-slate-800 text-text-secondary')} onClick={() => patchAnswers({ hardSubjectsPeriodPreference: opt.value })}>
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs opacity-80 mt-1">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {step === 3 && (
                <Card className="border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-sm font-semibold text-white mb-3">Qual estilo voce prefere?</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {STUDY_STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={cn(
                          'rounded-xl border px-3 py-3 text-left',
                          (answers.studyStyle || 'balanced') === opt.value
                            ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                            : 'border-slate-800 text-text-secondary'
                        )}
                        onClick={() =>
                          patchAnswers({
                            studyStyle: opt.value,
                            studyContentPreference: mapStudyStyleToContentPref(opt.value),
                          })
                        }
                      >
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs opacity-80 mt-1">{opt.desc}</div>
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
                  <Card className="border-slate-800 bg-slate-900/40 p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="mt-0.5 h-5 w-5 text-neon-blue" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">Data da prova (opcional)</p>
                        <p className="text-xs text-text-muted">
                          Se informada, a engine ajusta intensidade e entra em fase final automaticamente.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={cn(
                          'px-3 py-2 rounded-lg border text-sm',
                          hasExamDate
                            ? 'border-slate-800 text-text-secondary'
                            : 'border-neon-cyan bg-neon-cyan/10 text-white'
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
                          'px-3 py-2 rounded-lg border text-sm',
                          hasExamDate
                            ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                            : 'border-slate-800 text-text-secondary'
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

                  <Card className="border-slate-800 bg-slate-900/30 p-4 space-y-4">
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

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-text-muted">Todas as respostas desta tela alteram a geracao do cronograma.</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="ghost" onClick={resetAndClose}>Cancelar</Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setError(null);
                    setStep((s) => Math.max(0, s - 1));
                  }}
                  disabled={step === 0}
                >
                  Voltar
                </Button>
                {step < STEP_TITLES.length - 1 ? (
                  <Button variant="primary" onClick={next}>Proximo</Button>
                ) : (
                  <Button variant="primary" onClick={apply}>Salvar e regenerar cronograma</Button>
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
