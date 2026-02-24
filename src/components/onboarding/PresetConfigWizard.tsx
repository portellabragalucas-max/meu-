'use client';

/**
 * PresetConfigWizard
 * Wizard/modal para configurar preferencias ao escolher um modelo de estudo.
 */

import { useMemo, useState, useEffect, useRef, UIEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Button, Card, ProgressBar } from '@/components/ui';
import type {
  DailyHoursByWeekday,
  PresetWizardAnswers,
  StudyPreferences,
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

const defaultStepTitles = [
  'Disponibilidade',
  'Horários',
  'Foco e pausas',
  'Rotina e descanso',
  'Confirmação',
];
const defaultStepTitlesShort = ['Disp.', 'Hor.', 'Foco', 'Rotina', 'Conf.'];
const concursosStepTitles = [
  'Area',
  'Nivel',
  'Experiencia',
  'Disponibilidade',
  'Prioridades',
  'Confirmacao',
];
const concursosStepTitlesShort = ['Area', 'Nivel', 'Exp.', 'Disp.', 'Prior.', 'Conf.'];

const dayOptions: { label: string; value: number; key: WeekdayKey }[] = [
  { label: 'Dom', value: 0, key: 'dom' },
  { label: 'Seg', value: 1, key: 'seg' },
  { label: 'Ter', value: 2, key: 'ter' },
  { label: 'Qua', value: 3, key: 'qua' },
  { label: 'Qui', value: 4, key: 'qui' },
  { label: 'Sex', value: 5, key: 'sex' },
  { label: 'Sab', value: 6, key: 'sab' },
];

const quickHourOptions = [2, 3, 4, 5, 6];

const timeOptions = [
  { label: 'Manhã', value: 'manha' },
  { label: 'Tarde', value: 'tarde' },
  { label: 'Noite', value: 'noite' },
  { label: 'Misto', value: 'misto' },
] as const;

const focusOptions = [25, 50, 90, 120] as const;
const breakOptions = [5, 10, 15, 20] as const;

const goals = [
  { label: 'Passar no ENEM', value: 'enem' },
  { label: 'Medicina', value: 'medicina' },
  { label: 'Concurso', value: 'concurso' },
  { label: 'Outros', value: 'outros' },
] as const;

const concursoAreaOptions: Array<{
  label: string;
  value: NonNullable<PresetWizardAnswers['concursoArea']>;
  description: string;
}> = [
  {
    label: 'Area Policial / Seguranca Publica',
    value: 'policial',
    description: 'Penal, processo penal e legislacao penal especial como eixo especifico',
  },
  {
    label: 'Tribunais / Juridica',
    value: 'tribunais',
    description: 'Base juridica com civil e processo civil',
  },
  {
    label: 'Area Fiscal / Controle',
    value: 'fiscal',
    description: 'Tributario, contabilidade, auditoria e matematica financeira',
  },
  {
    label: 'Area Administrativa / Gestao',
    value: 'administrativa',
    description: 'Administracao, gestao e administracao publica',
  },
  {
    label: 'Bancaria',
    value: 'bancaria',
    description: 'Conhecimentos bancarios, matematica financeira e base comum',
  },
  {
    label: 'INSS / Previdenciaria',
    value: 'inss',
    description: 'Previdenciario, seguridade social e legislacao previdenciaria',
  },
  {
    label: 'Educacao',
    value: 'educacao',
    description: 'Didatica, legislacao educacional e politicas publicas',
  },
  {
    label: 'Personalizado',
    value: 'personalizado',
    description: 'Importa base comum e voce complementa manualmente depois',
  },
];

const concursoLevelOptions: Array<{
  label: string;
  value: NonNullable<PresetWizardAnswers['concursoLevel']>;
  description: string;
}> = [
  { label: 'Medio', value: 'medio', description: 'Reduce complexidade e aprofunda menos disciplinas avancadas' },
  { label: 'Superior', value: 'superior', description: 'Aumenta profundidade e peso de disciplinas juridicas/contabeis' },
  { label: 'Ambos', value: 'ambos', description: 'Cobertura mais ampla para editais mistos' },
];

const concursoExperienceOptions: Array<{
  label: string;
  value: NonNullable<PresetWizardAnswers['concursoExperience']>;
  description: string;
}> = [
  { label: 'Nunca comecei', value: 'nunca', description: 'Fortalece base e reduz carga inicial de materias especificas' },
  { label: 'Ja estudei um pouco', value: 'pouco', description: 'Base reforcada com progressao moderada' },
  { label: 'Tenho base intermediaria', value: 'intermediaria', description: 'Distribuicao equilibrada de base e especificas' },
  { label: 'Nivel avancado', value: 'avancado', description: 'Mais peso em materias especificas e maior profundidade' },
];

const concursoPriorityOptions: Array<{
  label: string;
  value: NonNullable<PresetWizardAnswers['concursoPriorityMode']>;
  description: string;
}> = [
  { label: 'Teoria', value: 'teoria', description: 'Mais carga em leitura, lei seca e consolidacao conceitual' },
  { label: 'Exercicios', value: 'exercicios', description: 'Mais peso em treino e disciplinas de maior resolucao pratica' },
  { label: 'Equilibrado', value: 'equilibrado', description: 'Balanceia teoria e pratica' },
];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const resolveGoal = (presetId: string, presetName: string): PresetWizardAnswers['goal'] => {
  const base = `${presetId} ${presetName}`.toLowerCase();
  if (base.includes('med')) return 'medicina';
  if (base.includes('conc')) return 'concurso';
  if (base.includes('enem')) return 'enem';
  return 'outros';
};

const isConcursoPresetSelection = (presetId: string, presetName: string) =>
  resolveGoal(presetId, presetName) === 'concurso';

const clampHours = (value: number) => Math.min(12, Math.max(0, Math.round(value * 2) / 2));

const formatHours = (value: number, clampValue = true) => {
  const safe = clampValue ? clampHours(value) : Math.max(0, value);
  const hours = Math.floor(safe);
  const minutes = Math.round((safe - hours) * 60);
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, '0')}`;
};

const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const formatDateLabel = (dateKey?: string) => {
  if (!dateKey) return 'Nao definido';
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
};

const buildDefaultDailyHours = (goal: PresetWizardAnswers['goal']): DailyHoursByWeekday => {
  if (goal === 'medicina') {
    return { dom: 0, seg: 5, ter: 5, qua: 5, qui: 5, sex: 5, sab: 3 };
  }
  if (goal === 'concurso') {
    return { dom: 0, seg: 4, ter: 4, qua: 4, qui: 4, sex: 4, sab: 2 };
  }
  if (goal === 'enem') {
    return { dom: 0, seg: 4, ter: 4, qua: 4, qui: 4, sex: 4, sab: 2 };
  }
  return { dom: 0, seg: 3, ter: 3, qua: 3, qui: 3, sex: 3, sab: 2 };
};

const getActiveDaysFromHours = (dailyHoursByWeekday: DailyHoursByWeekday) =>
  dayOptions.filter((day) => dailyHoursByWeekday[day.key] > 0).map((day) => day.value);

const getAverageHours = (dailyHoursByWeekday: DailyHoursByWeekday) => {
  const activeValues = Object.values(dailyHoursByWeekday).filter((value) => value > 0);
  if (activeValues.length === 0) return 0;
  const sum = activeValues.reduce((total, value) => total + value, 0);
  return sum / activeValues.length;
};

const getWeekdayAverageHours = (dailyHoursByWeekday: DailyHoursByWeekday) => {
  const keys: WeekdayKey[] = ['seg', 'ter', 'qua', 'qui', 'sex'];
  const values = keys
    .map((key) => dailyHoursByWeekday[key])
    .filter((value) => value > 0);
  if (values.length === 0) return getAverageHours(dailyHoursByWeekday);
  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
};

const defaultAnswers = (presetId: string, presetName: string): PresetWizardAnswers => {
  const goal = resolveGoal(presetId, presetName);
  const dailyHoursByWeekday = buildDefaultDailyHours(goal);
  const todayKey = toLocalDateKey(new Date());
  return {
    dailyHoursByWeekday,
    bestTime: 'misto',
    availableStart: '',
    availableEnd: '',
    focusMinutes: goal === 'medicina' ? 90 : 50,
    breakMinutes: 10,
    targetDailyHours: 0,
    goal,
    examDate: '',
    startDate: todayKey,
    concursoArea: goal === 'concurso' ? 'policial' : undefined,
    concursoLevel: goal === 'concurso' ? 'superior' : undefined,
    concursoExperience: goal === 'concurso' ? 'nunca' : undefined,
    concursoPriorityMode: goal === 'concurso' ? 'equilibrado' : undefined,
  };
};

export default function PresetConfigWizard({
  isOpen,
  presetId,
  presetName,
  baseSettings,
  onClose,
  onApply,
}: PresetConfigWizardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<PresetWizardAnswers>(() =>
    defaultAnswers(presetId, presetName)
  );
  const [error, setError] = useState<string | null>(null);
  const [massHours, setMassHours] = useState(4);
  const [massDays, setMassDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [showCustomDays, setShowCustomDays] = useState(false);
  const [hasCustomDays, setHasCustomDays] = useState(false);
  const [startMode, setStartMode] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const scrollContentRef = useRef<HTMLDivElement | null>(null);
  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);
  const tomorrowKey = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    return toLocalDateKey(next);
  }, []);
  const isConcursoWizard = useMemo(
    () => isConcursoPresetSelection(presetId, presetName),
    [presetId, presetName]
  );
  const activeStepTitles = isConcursoWizard ? concursosStepTitles : defaultStepTitles;
  const activeStepTitlesShort = isConcursoWizard ? concursosStepTitlesShort : defaultStepTitlesShort;
  const totalSteps = activeStepTitles.length;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyTouch = document.body.style.touchAction;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.touchAction = prevBodyTouch;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const initial = defaultAnswers(presetId, presetName);
    setStep(0);
    setAnswers(initial);
    setMassHours(clampHours(getWeekdayAverageHours(initial.dailyHoursByWeekday) || 2));
    setMassDays([1, 2, 3, 4, 5]);
    setShowCustomDays(false);
    setHasCustomDays(false);
    setStartMode('today');
    setError(null);
  }, [presetId, presetName, isOpen]);

  useEffect(() => {
    if (!isOpen || hasCustomDays) return;
    if (massDays.length === 0) return;
    setAnswers((prev) => {
      const updated = { ...prev.dailyHoursByWeekday };
      massDays.forEach((dayIndex) => {
        const dayKey = dayOptions.find((day) => day.value === dayIndex)?.key;
        if (!dayKey) return;
        updated[dayKey] = clampHours(massHours);
      });
      return { ...prev, dailyHoursByWeekday: updated };
    });
  }, [massHours, massDays, hasCustomDays, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!scrollContentRef.current) return;
    scrollContentRef.current.scrollLeft = 0;
  }, [isOpen, step]);

  const progress = Math.round(((step + 1) / totalSteps) * 100);

  const summary = useMemo(
    () => computeStudyPreferences(baseSettings, answers),
    [answers, baseSettings]
  );
  const activeDays = useMemo(
    () => getActiveDaysFromHours(answers.dailyHoursByWeekday),
    [answers.dailyHoursByWeekday]
  );
  const totalWeeklyHours = useMemo(
    () =>
      Object.values(answers.dailyHoursByWeekday).reduce(
        (total, value) => total + value,
        0
      ),
    [answers.dailyHoursByWeekday]
  );
  const averageDailyHours = useMemo(
    () => getAverageHours(answers.dailyHoursByWeekday),
    [answers.dailyHoursByWeekday]
  );
  const restDays = useMemo(
    () => dayOptions.filter((day) => answers.dailyHoursByWeekday[day.key] === 0).map((day) => day.value),
    [answers.dailyHoursByWeekday]
  );

  const updateDayHours = (dayIndex: number, hours: number) => {
    const dayKey = dayOptions.find((day) => day.value === dayIndex)?.key;
    if (!dayKey) return;
    setHasCustomDays(true);
    setAnswers((prev) => ({
      ...prev,
      dailyHoursByWeekday: {
        ...prev.dailyHoursByWeekday,
        [dayKey]: clampHours(hours),
      },
    }));
  };

  const toggleDayActive = (dayIndex: number) => {
    const dayKey = dayOptions.find((day) => day.value === dayIndex)?.key;
    if (!dayKey) return;
    setHasCustomDays(true);
    setAnswers((prev) => {
      const current = prev.dailyHoursByWeekday[dayKey] ?? 0;
      const nextValue = current > 0 ? 0 : clampHours(massHours || prev.targetDailyHours || 2);
      return {
        ...prev,
        dailyHoursByWeekday: {
          ...prev.dailyHoursByWeekday,
          [dayKey]: nextValue,
        },
      };
    });
  };

  const toggleMassDay = (dayIndex: number) => {
    setMassDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((day) => day !== dayIndex) : [...prev, dayIndex]
    );
  };

  const applyMassHours = () => {
    if (massDays.length === 0) return;
    setAnswers((prev) => {
      const updated = { ...prev.dailyHoursByWeekday };
      massDays.forEach((dayIndex) => {
        const dayKey = dayOptions.find((day) => day.value === dayIndex)?.key;
        if (!dayKey) return;
        updated[dayKey] = clampHours(massHours);
      });
      return { ...prev, dailyHoursByWeekday: updated };
    });
  };

  const resetRestDays = () => {
    setHasCustomDays(true);
    setAnswers((prev) => {
      const updated = { ...prev.dailyHoursByWeekday };
      dayOptions.forEach((day) => {
        if (updated[day.key] === 0) {
          updated[day.key] = clampHours(massHours || prev.targetDailyHours || 2);
        }
      });
      return { ...prev, dailyHoursByWeekday: updated };
    });
  };

  const copyWeekdaysToAll = () => {
    setHasCustomDays(true);
    setAnswers((prev) => {
      const weekdayValues = ['seg', 'ter', 'qua', 'qui', 'sex'] as WeekdayKey[];
      const values = weekdayValues
        .map((key) => prev.dailyHoursByWeekday[key])
        .filter((value) => value > 0);
      const average =
        values.length > 0
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : massHours || prev.targetDailyHours || 2;
      const normalized = clampHours(average);
      const updated = { ...prev.dailyHoursByWeekday };
      dayOptions.forEach((day) => {
        updated[day.key] = normalized;
      });
      return { ...prev, dailyHoursByWeekday: updated };
    });
  };

  const handleClose = () => {
    const initial = defaultAnswers(presetId, presetName);
    setStep(0);
    setAnswers(initial);
    setMassHours(clampHours(getWeekdayAverageHours(initial.dailyHoursByWeekday) || 2));
    setMassDays([1, 2, 3, 4, 5]);
    setShowCustomDays(false);
    setHasCustomDays(false);
    setStartMode('today');
    setError(null);
    onClose();
  };

  const handleNext = () => {
    setError(null);

    if (isConcursoWizard) {
      if (step === 0 && !answers.concursoArea) {
        setError('Selecione a area de concurso para continuar.');
        return;
      }
      if (step === 1 && !answers.concursoLevel) {
        setError('Selecione o nivel do concurso.');
        return;
      }
      if (step === 2 && !answers.concursoExperience) {
        setError('Selecione sua experiencia com concursos.');
        return;
      }
      if (step === 3 && activeDays.length === 0) {
        setError('Selecione pelo menos um dia de estudo para continuar.');
        return;
      }
      if (step === 4) {
        if (answers.availableStart && answers.availableEnd && answers.availableStart >= answers.availableEnd) {
          setError('O horario de inicio precisa ser antes do horario de termino.');
          return;
        }
        if (!answers.concursoPriorityMode) {
          setError('Selecione a prioridade de estudo (teoria/exercicios/equilibrado).');
          return;
        }
        if (!answers.startDate) {
          setError('Escolha quando deseja comecar.');
          return;
        }
        if (answers.startDate < todayKey) {
          setError('A data de inicio precisa ser hoje ou futura.');
          return;
        }
      }
    } else {
      if (step === 0 && activeDays.length === 0) {
        setError('Selecione pelo menos um dia de estudo para continuar.');
        return;
      }

      if (step === 1 && answers.availableStart && answers.availableEnd) {
        if (answers.availableStart >= answers.availableEnd) {
          setError('O horario de inicio precisa ser antes do horario de termino.');
          return;
        }
      }

      if (step === 3 && activeDays.length === 0) {
        setError('Escolha pelo menos um dia disponivel para estudo.');
        return;
      }
      if (step === 3) {
        if (!answers.startDate) {
          setError('Escolha quando deseja comecar.');
          return;
        }
        if (answers.startDate < todayKey) {
          setError('A data de inicio precisa ser hoje ou futura.');
          return;
        }
      }
    }

    setStep((prev) => Math.min(totalSteps - 1, prev + 1));
  };

  const handleApply = () => {
    onApply(summary.settings, summary.studyPrefs, answers);
    handleClose();
  };

  const handleWizardScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (element.scrollLeft !== 0) {
      element.scrollLeft = 0;
    }
  };

  if (!isOpen || !isMounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm px-2 py-4 sm:px-4 md:items-center"
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
          className="w-full md:max-w-3xl md:max-h-[85vh] max-h-[calc(100dvh-2rem)]"
        >
          <Card className="bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-slate-900/95 border-slate-800 shadow-2xl p-4 sm:p-6 h-[calc(100dvh-2rem)] md:h-auto max-h-[calc(100dvh-2rem)] md:max-h-[85vh] overflow-hidden flex flex-col min-h-0 rounded-none md:rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-neon-cyan">Modelo selecionado</p>
                <h2 className="text-2xl font-heading font-bold text-white">
                  {presetName}
                </h2>
              </div>
              <Button variant="ghost" onClick={handleClose}>
                Fechar
              </Button>
            </div>

            <div className="mt-4">
              <ProgressBar value={progress} label={`${progress}%`} />
              <div
                className="mt-2 grid gap-2 text-center text-[11px] leading-tight text-text-muted"
                style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}
              >
                {activeStepTitles.map((title, index) => (
                  <span
                    key={title}
                    className={cn(
                      'min-w-0 break-words',
                      index === step ? 'text-white' : 'text-text-muted'
                    )}
                  >
                    <span className="inline sm:hidden">{activeStepTitlesShort[index]}</span>
                    <span className="hidden sm:inline">{title}</span>
                  </span>
                ))}
              </div>
            </div>

            <div
              ref={scrollContentRef}
              onScroll={handleWizardScroll}
              className="mt-6 flex-1 min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden px-1 sm:px-2 pb-6 scroll-touch [touch-action:pan-y] [overscroll-behavior-x:none]"
            >
              {isConcursoWizard && step === 0 && (
                <div className="w-full min-w-0 space-y-6">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      Qual area de concurso voce pretende focar?
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Isso define os modulos especificos adicionados sobre a base comum.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {concursoAreaOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          'rounded-xl border px-4 py-3 text-left transition',
                          answers.concursoArea === option.value
                            ? 'border-neon-blue bg-neon-blue/10 text-white'
                            : 'border-slate-800 text-text-secondary hover:border-neon-blue/60'
                        )}
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, concursoArea: option.value, goal: 'concurso' }))
                        }
                      >
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="mt-1 text-xs opacity-80">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isConcursoWizard && step === 1 && (
                <div className="w-full min-w-0 space-y-6">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-white">Qual nivel do concurso?</h3>
                    <p className="text-sm text-text-secondary">
                      O nivel influencia profundidade e dificuldade das disciplinas geradas.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {concursoLevelOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          'rounded-xl border px-4 py-3 text-left transition',
                          answers.concursoLevel === option.value
                            ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                            : 'border-slate-800 text-text-secondary hover:border-neon-cyan/60'
                        )}
                        onClick={() => setAnswers((prev) => ({ ...prev, concursoLevel: option.value }))}
                      >
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="mt-1 text-xs opacity-80">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isConcursoWizard && step === 2 && (
                <div className="w-full min-w-0 space-y-6">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      Voce ja estudou para concursos antes?
                    </h3>
                    <p className="text-sm text-text-secondary">
                      A experiencia ajusta pesos iniciais e profundidade da trilha.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {concursoExperienceOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          'rounded-xl border px-4 py-3 text-left transition',
                          answers.concursoExperience === option.value
                            ? 'border-neon-purple bg-neon-purple/10 text-white'
                            : 'border-slate-800 text-text-secondary hover:border-neon-purple/60'
                        )}
                        onClick={() => setAnswers((prev) => ({ ...prev, concursoExperience: option.value }))}
                      >
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="mt-1 text-xs opacity-80">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {((!isConcursoWizard && step === 0) || (isConcursoWizard && step === 3)) && (
                <div className="w-full min-w-0 space-y-6">
                  <Card className="p-4 bg-slate-900/50 border-slate-800">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Aplicar em massa</h3>
                        <p className="text-xs text-text-muted">
                          Em massa define um padrao rapido; personalizar permite dias diferentes.
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {formatHours(massHours)} / dia
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-4">
                        <div>
                          <label className="text-sm text-text-secondary">Horas por dia</label>
                          <input
                            type="range"
                            min={0}
                            max={12}
                            step={0.5}
                            value={massHours}
                            onChange={(e) => setMassHours(clampHours(Number(e.target.value)))}
                            className="w-full accent-neon-cyan mt-2"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-text-secondary">Valor exato (h)</label>
                          <input
                            type="number"
                            min={0}
                            max={12}
                            step={0.5}
                            value={massHours}
                            onChange={(e) => setMassHours(clampHours(Number(e.target.value)))}
                            className="input-field mt-2"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {quickHourOptions.map((value) => (
                          <button
                            key={value}
                            className={cn(
                              'px-3 py-2 rounded-lg border text-sm transition',
                              massHours === value
                                ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                                : 'border-slate-800 text-text-secondary hover:border-neon-cyan/60'
                            )}
                            onClick={() => setMassHours(value)}
                          >
                            {value}h
                          </button>
                        ))}
                      </div>

                      <div>
                        <p className="text-sm text-text-secondary mb-2">Aplicar aos dias:</p>
                        <div className="flex flex-wrap gap-2">
                          {dayOptions.map((day) => (
                            <button
                              key={day.value}
                              className={cn(
                                'px-3 py-2 rounded-lg border text-sm transition',
                                massDays.includes(day.value)
                                  ? 'border-neon-purple bg-neon-purple/20 text-white'
                                  : 'border-slate-800 text-text-secondary hover:border-neon-purple/60'
                              )}
                              onClick={() => toggleMassDay(day.value)}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button variant="secondary" onClick={applyMassHours} disabled={massDays.length === 0}>
                        Aplicar aos dias selecionados
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4 bg-slate-900/40 border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Personalizar por dia</h3>
                        <p className="text-xs text-text-muted">
                          Ajuste dias especificos quando precisar de rotinas diferentes.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => setShowCustomDays((prev) => !prev)}
                      >
                        {showCustomDays ? 'Ocultar' : 'Editar'}
                      </Button>
                    </div>

                    {showCustomDays && (
                      <div className="mt-4 space-y-3">
                        {dayOptions.map((day) => {
                          const hours = answers.dailyHoursByWeekday[day.key] ?? 0;
                          const isActive = hours > 0;

                          return (
                            <div
                              key={day.value}
                              className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className={cn(
                                      'h-10 min-w-[48px] rounded-lg border px-2 text-sm font-medium transition',
                                      isActive
                                        ? 'border-neon-cyan/60 text-white'
                                        : 'border-slate-800 text-text-muted'
                                    )}
                                    onClick={() => toggleDayActive(day.value)}
                                  >
                                    {day.label}
                                  </button>
                                  <span className="text-xs text-text-muted">
                                    {isActive ? 'Ativo' : 'Descanso'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={12}
                                    step={0.5}
                                    value={hours}
                                    disabled={!isActive}
                                    onChange={(e) =>
                                      updateDayHours(day.value, Number(e.target.value))
                                    }
                                    className={cn(
                                      'input-field h-10 w-20 px-3 py-2 text-sm',
                                      !isActive && 'opacity-70'
                                    )}
                                  />
                                  <span className="min-w-[38px] text-right text-xs text-text-muted">
                                    {formatHours(hours)}
                                  </span>
                                </div>
                              </div>

                              <input
                                type="range"
                                min={0}
                                max={12}
                                step={0.5}
                                value={hours}
                                disabled={!isActive}
                                onChange={(e) =>
                                  updateDayHours(day.value, Number(e.target.value))
                                }
                                className={cn(
                                  'mt-3 w-full accent-neon-blue',
                                  !isActive && 'opacity-40'
                                )}
                              />
                            </div>
                          );
                        })}

                        <div className="flex flex-wrap gap-3 pt-2">
                          <Button variant="secondary" onClick={copyWeekdaysToAll}>
                            Copiar Seg-Sex para todos
                          </Button>
                          <Button variant="ghost" onClick={resetRestDays}>
                            Zerar dias de descanso
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
                    <span>
                      Total semanal:{' '}
                      <span className="text-white font-medium">
                        {formatHours(totalWeeklyHours, false)}
                      </span>
                    </span>
                    <span>
                      Media diaria:{' '}
                      <span className="text-white font-medium">
                        {formatHours(averageDailyHours, false)}
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {isConcursoWizard && step === 4 && (
                <div className="w-full min-w-0 space-y-6">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      Quer focar mais em teoria, exercicios ou equilibrado?
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Isso ajusta pesos e carga horaria das disciplinas geradas automaticamente.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {concursoPriorityOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          'rounded-xl border px-4 py-3 text-left transition',
                          answers.concursoPriorityMode === option.value
                            ? 'border-neon-blue bg-neon-blue/10 text-white'
                            : 'border-slate-800 text-text-secondary hover:border-neon-blue/60'
                        )}
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, concursoPriorityMode: option.value, goal: 'concurso' }))
                        }
                      >
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="mt-1 text-xs opacity-80">{option.description}</div>
                      </button>
                    ))}
                  </div>

                  <Card className="border-slate-800 bg-slate-900/40 p-4">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Ajustes de rotina (opcional)</h4>
                      <p className="mt-1 text-xs text-text-muted">
                        Mantem a mesma UX do wizard e melhora a geracao inicial do cronograma.
                      </p>
                    </div>

                    <div className="mt-4 space-y-5">
                      <div>
                        <h5 className="mb-2 text-sm font-medium text-white">Periodo em que rende mais</h5>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          {timeOptions.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              className={cn(
                                'rounded-lg border px-3 py-2 text-left text-sm transition',
                                answers.bestTime === opt.value
                                  ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                                  : 'border-slate-800 text-text-secondary hover:border-neon-cyan/60'
                              )}
                              onClick={() => setAnswers((prev) => ({ ...prev, bestTime: opt.value }))}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm text-text-secondary">Inicio disponivel</label>
                          <input
                            type="time"
                            value={answers.availableStart}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, availableStart: e.target.value }))
                            }
                            className="input-field mt-2"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-text-secondary">Fim disponivel</label>
                          <input
                            type="time"
                            value={answers.availableEnd}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, availableEnd: e.target.value }))
                            }
                            className="input-field mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <h5 className="mb-2 text-sm font-medium text-white">Dias sem agendamento automatico</h5>
                        <div className="flex flex-wrap gap-2">
                          {dayOptions.map((day) => (
                            <button
                              key={day.value}
                              type="button"
                              className={cn(
                                'rounded-lg border px-3 py-2 text-sm transition',
                                restDays.includes(day.value)
                                  ? 'border-neon-purple bg-neon-purple/20 text-white'
                                  : 'border-slate-800 text-text-secondary hover:border-neon-purple/60'
                              )}
                              onClick={() => toggleDayActive(day.value)}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="mb-2 text-sm font-medium text-white">Quando deseja comecar</h5>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => {
                              setStartMode('today');
                              setAnswers((prev) => ({ ...prev, startDate: todayKey }));
                            }}
                            className={cn(
                              'rounded-xl border px-3 py-3 text-left transition',
                              startMode === 'today'
                                ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                                : 'border-slate-800 text-text-secondary hover:border-neon-cyan/60'
                            )}
                          >
                            <div className="text-sm font-medium">Hoje</div>
                            <div className="text-xs opacity-80">{formatDateLabel(todayKey)}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStartMode('tomorrow');
                              setAnswers((prev) => ({ ...prev, startDate: tomorrowKey }));
                            }}
                            className={cn(
                              'rounded-xl border px-3 py-3 text-left transition',
                              startMode === 'tomorrow'
                                ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                                : 'border-slate-800 text-text-secondary hover:border-neon-cyan/60'
                            )}
                          >
                            <div className="text-sm font-medium">Amanha</div>
                            <div className="text-xs opacity-80">{formatDateLabel(tomorrowKey)}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStartMode('custom')}
                            className={cn(
                              'rounded-xl border px-3 py-3 text-left transition',
                              startMode === 'custom'
                                ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                                : 'border-slate-800 text-text-secondary hover:border-neon-cyan/60'
                            )}
                          >
                            <div className="text-sm font-medium">Escolher data</div>
                            <div className="text-xs opacity-80">{formatDateLabel(answers.startDate)}</div>
                          </button>
                        </div>
                        {startMode === 'custom' && (
                          <div className="mt-3">
                            <label className="text-sm text-text-secondary">Data de inicio</label>
                            <input
                              type="date"
                              min={todayKey}
                              value={answers.startDate || ''}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, startDate: e.target.value }))
                              }
                              className="input-field mt-2"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-sm text-text-secondary">Meta diaria ideal (ajuste fino)</label>
                        <div className="mt-3">
                          {(() => {
                            const sliderValue =
                              answers.targetDailyHours || Math.max(1, Math.round(averageDailyHours * 2) / 2);
                            return (
                              <input
                                type="range"
                                min={1}
                                max={12}
                                step={0.5}
                                value={sliderValue}
                                onChange={(e) =>
                                  setAnswers((prev) => ({
                                    ...prev,
                                    targetDailyHours: Number(e.target.value),
                                  }))
                                }
                                className="w-full accent-neon-blue"
                              />
                            );
                          })()}
                          <div className="mt-1 flex justify-between text-xs text-text-muted">
                            <span>1h</span>
                            <span className="font-medium text-white">
                              {formatHours(
                                answers.targetDailyHours || Math.max(1, Math.round(averageDailyHours * 2) / 2),
                                false
                              )}
                            </span>
                            <span>12h</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-text-secondary">Data da prova (opcional)</label>
                        <input
                          type="date"
                          value={answers.examDate || ''}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, examDate: e.target.value }))
                          }
                          className="input-field mt-2"
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {!isConcursoWizard && step === 1 && (
                <div className="w-full min-w-0 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Em que periodo voce rende mais
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {timeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          className={cn(
                            'rounded-xl border px-4 py-3 text-sm text-left transition',
                            answers.bestTime === opt.value
                              ? 'border-neon-blue bg-neon-blue/10 text-white'
                              : 'border-slate-800 text-text-secondary hover:border-neon-blue/60'
                          )}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, bestTime: opt.value }))
                          }
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-text-secondary">
                      Qual janela de tempo voce tem disponivel
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-text-secondary">Inicio disponivel</label>
                      <input
                        type="time"
                        value={answers.availableStart}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, availableStart: e.target.value }))
                        }
                        className="input-field mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-text-secondary">Fim disponivel</label>
                      <input
                        type="time"
                        value={answers.availableEnd}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, availableEnd: e.target.value }))
                        }
                        className="input-field mt-2"
                      />
                    </div>
                  </div>
                  {answers.availableStart && (
                    <p className="text-xs text-text-muted">
                      {answers.bestTime === 'manha' && timeToMinutes(answers.availableStart) > 12 * 60
                        ? 'Dica: para manhã, tente começar mais cedo.'
                        : answers.bestTime === 'noite' &&
                          timeToMinutes(answers.availableStart) < 15 * 60
                        ? 'Dica: para noite, um início após 18:00 costuma funcionar melhor.'
                        : answers.bestTime === 'tarde' &&
                          timeToMinutes(answers.availableStart) < 11 * 60
                        ? 'Dica: para tarde, um início após 13:00 costuma render mais.'
                        : ''}
                    </p>
                  )}
                </div>
              )}

              {!isConcursoWizard && step === 2 && (
                <div className="w-full min-w-0 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Seu foco aguenta quanto tempo antes de cair
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {focusOptions.map((value) => (
                        <button
                          key={value}
                          className={cn(
                            'px-4 py-2 rounded-lg border text-sm transition',
                            answers.focusMinutes === value
                              ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                              : 'border-slate-800 text-text-secondary hover:border-neon-cyan/60'
                          )}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, focusMinutes: value }))
                          }
                        >
                          {value} min
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Qual pausa te deixa melhor
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {breakOptions.map((value) => (
                        <button
                          key={value}
                          className={cn(
                            'px-4 py-2 rounded-lg border text-sm transition',
                            answers.breakMinutes === value
                              ? 'border-neon-purple bg-neon-purple/10 text-white'
                              : 'border-slate-800 text-text-secondary hover:border-neon-purple/60'
                          )}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, breakMinutes: value }))
                          }
                        >
                          {value} min
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!isConcursoWizard && step === 3 && (
                <div className="w-full min-w-0 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Principal objetivo
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {goals.map((goal) => (
                        <button
                          key={goal.value}
                          className={cn(
                            'rounded-xl border px-4 py-3 text-sm text-left transition',
                            answers.goal === goal.value
                              ? 'border-neon-blue bg-neon-blue/10 text-white'
                              : 'border-slate-800 text-text-secondary hover:border-neon-blue/60'
                          )}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, goal: goal.value }))
                          }
                        >
                          {goal.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Voce quer dia(s) sem agendamento automatico
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {dayOptions.map((day) => (
                        <button
                          key={day.value}
                          className={cn(
                            'px-3 py-2 rounded-lg border text-sm transition',
                            restDays.includes(day.value)
                              ? 'border-neon-purple bg-neon-purple/20 text-white'
                              : 'border-slate-800 text-text-secondary hover:border-neon-purple/60'
                          )}
                          onClick={() => toggleDayActive(day.value)}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-text-muted mt-2">
                      Sugestao: escolha 1-2 dias para descanso.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Quando deseja comecar
                    </h3>
                    <p className="text-sm text-text-secondary mb-3">
                      Defina quando o cronograma inicial deve comecar.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStartMode('today');
                          setAnswers((prev) => ({ ...prev, startDate: todayKey }));
                        }}
                        className={cn(
                          'rounded-xl border px-3 py-3 text-left transition',
                          startMode === 'today'
                            ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                            : 'border-slate-800 text-text-secondary hover:border-neon-cyan/60'
                        )}
                      >
                        <div className="text-sm font-medium">Hoje</div>
                        <div className="text-xs opacity-80">{formatDateLabel(todayKey)}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStartMode('tomorrow');
                          setAnswers((prev) => ({ ...prev, startDate: tomorrowKey }));
                        }}
                        className={cn(
                          'rounded-xl border px-3 py-3 text-left transition',
                          startMode === 'tomorrow'
                            ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                            : 'border-slate-800 text-text-secondary hover:border-neon-cyan/60'
                        )}
                      >
                        <div className="text-sm font-medium">Amanha</div>
                        <div className="text-xs opacity-80">{formatDateLabel(tomorrowKey)}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStartMode('custom')}
                        className={cn(
                          'rounded-xl border px-3 py-3 text-left transition',
                          startMode === 'custom'
                            ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                            : 'border-slate-800 text-text-secondary hover:border-neon-cyan/60'
                        )}
                      >
                        <div className="text-sm font-medium">Escolher data</div>
                        <div className="text-xs opacity-80">{formatDateLabel(answers.startDate)}</div>
                      </button>
                    </div>
                    {startMode === 'custom' && (
                      <div className="mt-3">
                        <label className="text-sm text-text-secondary">Data de inicio</label>
                        <input
                          type="date"
                          min={todayKey}
                          value={answers.startDate || ''}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, startDate: e.target.value }))
                          }
                          className="input-field mt-2"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-text-secondary">
                      Meta diaria ideal (ajuste fino)
                    </label>
                    <div className="mt-3">
                      {(() => {
                        const sliderValue =
                          answers.targetDailyHours || Math.max(1, Math.round(averageDailyHours * 2) / 2);
                        return (
                          <input
                            type="range"
                            min={1}
                            max={12}
                            step={0.5}
                            value={sliderValue}
                            onChange={(e) =>
                              setAnswers((prev) => ({
                                ...prev,
                                targetDailyHours: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-neon-blue"
                          />
                        );
                      })()}
                      <div className="flex justify-between text-xs text-text-muted mt-1">
                        <span>1h</span>
                        <span className="text-white font-medium">
                          {formatHours(
                            answers.targetDailyHours || Math.max(1, Math.round(averageDailyHours * 2) / 2),
                            false
                          )}
                        </span>
                        <span>12h</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-text-secondary">
                      Data da prova (opcional)
                    </label>
                    <input
                      type="date"
                      value={answers.examDate || ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, examDate: e.target.value }))
                      }
                      className="input-field mt-2"
                    />
                  </div>
                </div>
              )}

              {((!isConcursoWizard && step === 4) || (isConcursoWizard && step === 5)) && (
                <div className="w-full min-w-0 space-y-4">
                  <div className="flex items-center gap-2 text-neon-cyan">
                    <CheckCircle2 className="w-5 h-5" />
                    <h3 className="text-lg font-semibold text-white">Resumo gerado</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary">
                    <Card className="p-4 bg-slate-900/50 border-slate-800">
                      <p className="text-white font-medium mb-2">Agenda</p>
                      <p>Meta diaria: {formatHours(summary.settings.dailyGoalHours, false)}</p>
                      <p>Bloco: {summary.settings.maxBlockMinutes} min</p>
                      <p>Pausa: {summary.settings.breakMinutes} min</p>
                    </Card>
                    <Card className="p-4 bg-slate-900/50 border-slate-800">
                      <p className="text-white font-medium mb-2">Horario</p>
                      <p>
                        {summary.settings.preferredStart} - {summary.settings.preferredEnd}
                      </p>
                      <p>Dias ativos: {summary.studyPrefs.daysOfWeek.length}</p>
                      <p>
                        Descanso:{' '}
                        {summary.settings.excludeDays.length === 0
                          ? 'Nenhum'
                          : summary.settings.excludeDays
                              .map((day) => dayOptions.find((d) => d.value === day)?.label)
                              .filter(Boolean)
                              .join(', ')}
                      </p>
                      <p>Inicio: {formatDateLabel(answers.startDate)}</p>
                      {answers.examDate ? <p>Prova: {answers.examDate}</p> : null}
                    </Card>
                  </div>

                  {isConcursoWizard && (
                    <Card className="p-4 bg-slate-900/50 border-slate-800 text-sm text-text-secondary">
                      <p className="text-white font-medium mb-2">Perfil de concurso</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <p>
                          Area:{' '}
                          <span className="text-white">
                            {concursoAreaOptions.find((item) => item.value === answers.concursoArea)?.label ||
                              'Nao definido'}
                          </span>
                        </p>
                        <p>
                          Nivel:{' '}
                          <span className="text-white">
                            {concursoLevelOptions.find((item) => item.value === answers.concursoLevel)?.label ||
                              'Nao definido'}
                          </span>
                        </p>
                        <p>
                          Experiencia:{' '}
                          <span className="text-white">
                            {concursoExperienceOptions.find((item) => item.value === answers.concursoExperience)
                              ?.label || 'Nao definido'}
                          </span>
                        </p>
                        <p>
                          Foco:{' '}
                          <span className="text-white">
                            {concursoPriorityOptions.find((item) => item.value === answers.concursoPriorityMode)
                              ?.label || 'Nao definido'}
                          </span>
                        </p>
                      </div>
                    </Card>
                  )}

                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Sparkles className="w-4 h-4" />
                    Aplicaremos automaticamente essas preferencias em Configuracoes.
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 text-sm text-red-400 border border-red-500/30 bg-red-500/10 rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="mt-4 shrink-0 flex items-center justify-between border-t border-slate-800/60 bg-gradient-to-b from-transparent via-slate-950/70 to-slate-950/90 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
              <div className="text-xs text-text-muted flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Etapa {step + 1} de {totalSteps}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setStep((prev) => Math.max(0, prev - 1))}
                  disabled={step === 0}
                >
                  Voltar
                </Button>
                {step < totalSteps - 1 ? (
                  <Button variant="primary" onClick={handleNext}>
                    Proximo
                  </Button>
                ) : (
                  <Button variant="primary" onClick={handleApply} leftIcon={<Calendar className="w-4 h-4" />}>
                    Aplicar configuracoes
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    ,
    document.body
  );
}

