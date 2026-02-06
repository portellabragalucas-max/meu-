'use client';

/**
 * Settings Page
 * Perfil do usuário, preferências de estudo e parâmetros da IA
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  User,
  Clock,
  Brain,
  Bell,
  Shield,
  Palette,
  Save,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { useOnboarding, useLocalStorage } from '@/hooks';
import { cn } from '@/lib/utils';
import type { DailyHoursByWeekday, StudyPreferences, UserSettings, WeekdayKey } from '@/types';
import { defaultSettings } from '@/lib/defaultSettings';

const initialSettings: UserSettings = defaultSettings;

const aiDifficultyOptions = [
  { value: 'easy', label: 'Leve', description: 'Sessoes mais curtas, mais pausas' },
  { value: 'medium', label: 'Moderado', description: 'Equilibrio entre estudo e descanso' },
  { value: 'hard', label: 'Intenso', description: 'Sessoes longas, menos pausas' },
  { value: 'adaptive', label: 'Adaptativo', description: 'A IA ajusta com base no seu desempenho' },
] as const;

const alarmSoundOptions = [
  {
    value: 'pulse' as const,
    label: 'Pulse',
    description: 'Bipes repetidos e mais chamativos',
  },
  {
    value: 'beep' as const,
    label: 'Beep',
    description: 'Um aviso simples e direto',
  },
  {
    value: 'chime' as const,
    label: 'Chime',
    description: 'Toque curto em dois tons',
  },
  {
    value: 'soft' as const,
    label: 'Soft',
    description: 'Aviso suave e discreto',
  },
];

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const weekDayKeys: WeekdayKey[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

const clampHours = (value: number) => Math.min(12, Math.max(0, Math.round(value * 2) / 2));

const formatHours = (value: number) => {
  const safe = Math.max(0, value);
  const hours = Math.floor(safe);
  const minutes = Math.round((safe - hours) * 60);
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, '0')}`;
};

const buildDailyHoursByWeekday = (dailyGoalHours: number, excludeDays: number[]): DailyHoursByWeekday => {
  return weekDayKeys.reduce((acc, key, index) => {
    acc[key] = excludeDays.includes(index) ? 0 : clampHours(dailyGoalHours);
    return acc;
  }, {} as DailyHoursByWeekday);
};


export default function SettingsPage() {
  const { resetOnboarding } = useOnboarding();
  const { data: session } = useSession();
  const [settings, setSettings] = useLocalStorage<UserSettings>('nexora_user_settings', initialSettings);
  const [studyPrefs, setStudyPrefs] = useLocalStorage<StudyPreferences>('nexora_study_prefs', {
    hoursPerDay: initialSettings.dailyGoalHours,
    daysOfWeek: [1, 2, 3, 4, 5],
    mode: 'random',
    examDate: '',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasRemotePrefs, setHasRemotePrefs] = useState(false);
  const [hasLocalPrefs, setHasLocalPrefs] = useState(false);
  const hasAttemptedRemotePrefs = useRef(false);
  const [pendingAlarmSound, setPendingAlarmSound] = useState<UserSettings['alarmSound']>(
    settings.alarmSound || 'pulse'
  );
  const [alarmApplied, setAlarmApplied] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  const dailyHoursByWeekday =
    settings.dailyHoursByWeekday ??
    buildDailyHoursByWeekday(settings.dailyGoalHours, settings.excludeDays ?? []);

  const weeklyTotalHours = Object.values(dailyHoursByWeekday).reduce(
    (sum, value) => sum + value,
    0
  );
  const activeDayValues = Object.values(dailyHoursByWeekday).filter((value) => value > 0);
  const averageDailyHours =
    activeDayValues.length > 0 ? weeklyTotalHours / activeDayValues.length : 0;
  const emailValue = settings.email || session?.user?.email || '';

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateDailyHours = (nextHours: DailyHoursByWeekday) => {
    const activeDays = weekDayKeys
      .map((key, index) => ({ key, index, value: nextHours[key] }))
      .filter((entry) => entry.value > 0);
    const nextExcludeDays = weekDayKeys
      .map((key, index) => (nextHours[key] > 0 ? null : index))
      .filter((value): value is number => value !== null);
    const nextAverage =
      activeDays.length > 0
        ? activeDays.reduce((sum, entry) => sum + entry.value, 0) / activeDays.length
        : settings.dailyGoalHours;

    setSettings((prev) => ({
      ...prev,
      dailyHoursByWeekday: nextHours,
      excludeDays: nextExcludeDays,
      dailyGoalHours: Number(nextAverage.toFixed(1)),
    }));
    setHasChanges(true);
  };

  const updateDayHours = (dayIndex: number, hours: number) => {
    const key = weekDayKeys[dayIndex];
    const next = { ...dailyHoursByWeekday, [key]: clampHours(hours) };
    updateDailyHours(next);
  };

  const handleDailyGoalChange = (value: number) => {
    const next = { ...dailyHoursByWeekday };
    weekDayKeys.forEach((key, index) => {
      next[key] = settings.excludeDays.includes(index) ? 0 : clampHours(value);
    });
    updateDailyHours(next);
  };

  useEffect(() => {
    if (settings.dailyHoursByWeekday) return;
    const fallback = buildDailyHoursByWeekday(
      settings.dailyGoalHours,
      settings.excludeDays ?? []
    );
    setSettings((prev) => ({ ...prev, dailyHoursByWeekday: fallback }));
  }, [settings.dailyHoursByWeekday, settings.dailyGoalHours, settings.excludeDays, setSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasLocalPrefs(Boolean(window.localStorage.getItem('nexora_user_settings')));
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    setSettings((prev) => ({
      ...prev,
      // only fill from session when name was never set
      name: prev.name == null ? session.user?.name || 'Estudante' : prev.name,
      email: prev.email && prev.email.trim().length > 0 ? prev.email : session.user?.email || '',
      avatar: prev.avatar || session.user?.image || undefined,
    }));
  }, [session?.user, setSettings]);

  useEffect(() => {
    if (hasRemotePrefs) return;
    if (hasAttemptedRemotePrefs.current) return;
    let isMounted = true;
    const loadRemotePrefs = async () => {
      hasAttemptedRemotePrefs.current = true;
      try {
        const response = await fetch('/api/preferences');
        if (!response.ok) return;
        const payload = await response.json();
        if (!payload?.success || !payload?.data) return;

        const remote = payload.data;
        const restDays =
          typeof remote.restDays === 'string'
            ? (() => {
                try {
                  const parsed = JSON.parse(remote.restDays);
                  return Array.isArray(parsed) ? parsed : [];
                } catch {
                  return [];
                }
              })()
            : Array.isArray(remote.restDays)
              ? remote.restDays
              : [];
        const remoteDailyHours =
          typeof remote.dailyHoursByWeekday === 'string'
            ? (() => {
                try {
                  return JSON.parse(remote.dailyHoursByWeekday);
                } catch {
                  return null;
                }
              })()
            : remote.dailyHoursByWeekday ?? null;

        if (!isMounted) return;
        setSettings((prev) => ({
          ...prev,
          dailyGoalHours: remote.dailyGoalHours ?? prev.dailyGoalHours,
          preferredStart: remote.preferredStart ?? prev.preferredStart,
          preferredEnd: remote.preferredEnd ?? prev.preferredEnd,
          maxBlockMinutes: remote.maxBlockMinutes ?? prev.maxBlockMinutes,
          breakMinutes: remote.breakMinutes ?? prev.breakMinutes,
          alarmSound: remote.alarmSound ?? prev.alarmSound,
          dailyHoursByWeekday: remoteDailyHours ?? prev.dailyHoursByWeekday,
          excludeDays: restDays.length > 0 ? restDays : prev.excludeDays,
          examDate: remote.examDate ?? prev.examDate,
        }));
        const resolvedDaily =
          remoteDailyHours ??
          buildDailyHoursByWeekday(
            remote.dailyGoalHours ?? settings.dailyGoalHours,
            restDays.length > 0 ? restDays : settings.excludeDays
          );
        const activeDays = weekDayKeys
          .map((key, index) => ({ key, index }))
          .filter((entry) => (resolvedDaily[entry.key] ?? 0) > 0)
          .map((entry) => entry.index);
        setStudyPrefs({
          hoursPerDay: remote.dailyGoalHours ?? settings.dailyGoalHours,
          daysOfWeek: activeDays,
          mode: remote.examDate ? 'exam' : 'random',
          examDate: remote.examDate || '',
        });
        setHasRemotePrefs(true);
      } catch (error) {
        console.warn('Erro ao carregar preferências remotas:', error);
      }
    };

    if (!hasChanges) {
      loadRemotePrefs();
    }

    return () => {
      isMounted = false;
    };
  }, [hasChanges, hasRemotePrefs, setSettings, setStudyPrefs, settings.dailyGoalHours, settings.excludeDays]);

  useEffect(() => {
    setPendingAlarmSound(settings.alarmSound || 'pulse');
  }, [settings.alarmSound]);

  useEffect(() => {
    if (!alarmApplied) return;
    const timeout = setTimeout(() => setAlarmApplied(false), 1200);
    return () => clearTimeout(timeout);
  }, [alarmApplied]);

  const ensureAudioContext = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioRef.current.state === 'suspended') {
        audioRef.current.resume();
      }
    } catch (error) {
      console.warn('Erro ao preparar audio:', error);
    }
  };

  const playAlarmPreview = (sound: UserSettings['alarmSound']) => {
    try {
      ensureAudioContext();
      if (!audioRef.current) return;
      const context = audioRef.current;
      const now = context.currentTime;
      const scheduleBeep = (start: number, duration: number, freq: number, type: OscillatorType) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      };

      if (sound === 'beep') {
        const duration = 1.0;
        const gap = 0.25;
        const repeats = 4;
        for (let i = 0; i < repeats; i += 1) {
          const start = now + i * (duration + gap);
          scheduleBeep(start, duration, 880, 'sine');
        }
        return;
      }
      if (sound === 'chime') {
        const cycle = 0.9;
        const repeats = 6;
        for (let i = 0; i < repeats; i += 1) {
          const start = now + i * cycle;
          scheduleBeep(start, 0.35, 880, 'sine');
          scheduleBeep(start + 0.4, 0.45, 660, 'sine');
        }
        return;
      }
      if (sound === 'soft') {
        const duration = 0.25;
        const gap = 0.15;
        const repeats = 12;
        for (let i = 0; i < repeats; i += 1) {
          const start = now + i * (duration + gap);
          scheduleBeep(start, duration, 520, 'sine');
        }
        return;
      }

      const beepDuration = 0.24;
      const gap = 0.08;
      const repeats = 16;
      for (let i = 0; i < repeats; i += 1) {
        const start = now + i * (beepDuration + gap);
        scheduleBeep(start, beepDuration, 880, 'square');
      }
    } catch (error) {
      console.warn('Erro ao tocar alarme:', error);
    }
  };

  const toggleExcludeDay = (dayIndex: number) => {
    const key = weekDayKeys[dayIndex];
    const isRest = dailyHoursByWeekday[key] === 0;
    const next = {
      ...dailyHoursByWeekday,
      [key]: isRest ? clampHours(settings.dailyGoalHours || 2) : 0,
    };
    updateDailyHours(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      setHasRemotePrefs(true);
      setHasLocalPrefs(true);
    } catch (error) {
      console.warn('Falha ao salvar preferências no servidor:', error);
    }
    const activeDays = weekDayKeys
      .map((key, index) => ({ key, index }))
      .filter((entry) => dailyHoursByWeekday[entry.key] > 0)
      .map((entry) => entry.index);
    setStudyPrefs({
      hoursPerDay: averageDailyHours || settings.dailyGoalHours,
      daysOfWeek: activeDays,
      mode: settings.examDate ? 'exam' : 'random',
      examDate: settings.examDate || '',
    });
    setSaving(false);
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(initialSettings);
    const fallbackHours =
      initialSettings.dailyHoursByWeekday ??
      buildDailyHoursByWeekday(initialSettings.dailyGoalHours, initialSettings.excludeDays ?? []);
    const activeDays = weekDayKeys
      .map((key, index) => ({ key, index }))
      .filter((entry) => fallbackHours[entry.key] > 0)
      .map((entry) => entry.index);
    const avgHours = activeDays.length
      ? activeDays.reduce((sum, index) => sum + fallbackHours[weekDayKeys[index]], 0) /
        activeDays.length
      : initialSettings.dailyGoalHours;
    setStudyPrefs({
      hoursPerDay: Number(avgHours.toFixed(1)),
      daysOfWeek: activeDays,
      mode: 'random',
      examDate: '',
    });
    setHasChanges(false);
  };

  const handleResetOnboarding = () => {
    if (confirm('Isso vai reiniciar o tutorial e limpar suas preferências. Continuar?')) {
      try {
        localStorage.removeItem('nexora_subjects');
        localStorage.removeItem('nexora_onboarding');
        localStorage.removeItem('nexora_planner_blocks');
        localStorage.removeItem('nexora_analytics');
        localStorage.removeItem('nexora_study_prefs');
      } catch (error) {
        console.warn('Erro ao limpar dados locais:', error);
      }
      resetOnboarding();
      window.location.reload();
    }
  };

  const handleResetProgress = () => {
    if (confirm('Isso vai apagar todas as disciplinas e progresso. Continuar?')) {
      try {
        localStorage.removeItem('nexora_subjects');
        localStorage.removeItem('nexora_onboarding');
        localStorage.removeItem('nexora_planner_blocks');
        localStorage.removeItem('nexora_analytics');
        localStorage.removeItem('nexora_study_prefs');
      } catch (error) {
        console.warn('Erro ao limpar dados locais:', error);
      }
      resetOnboarding();
      window.location.reload();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Configurações</h1>
          <p className="text-sm text-text-secondary mt-1">
            Personalize sua experiência de estudos
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Resetar
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        )}
      </div>

      {!hasRemotePrefs && !hasLocalPrefs && (
        <Card className="border-neon-cyan/40 bg-neon-cyan/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white font-medium">Ainda não configurado</p>
              <p className="text-xs text-text-secondary">
                Escolha um modelo na página de disciplinas para aplicar um plano automático.
              </p>
            </div>
            <Button variant="secondary" onClick={() => (window.location.href = '/subjects')}>
              Configurar agora
            </Button>
          </div>
        </Card>
      )}

      {/* Seção de Perfil */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-neon-blue/20 flex items-center justify-center">
            <User className="w-5 h-5 text-neon-blue" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-white">Perfil</h2>
            <p className="text-sm text-text-secondary">Suas informações pessoais</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Nome de Exibição
            </label>
            <input
              type="text"
              value={settings.name ?? ''}
              onChange={(e) => updateSetting('name', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              E-mail
            </label>
            <input
              type="email"
              value={emailValue}
              readOnly
              className="input-field opacity-80 cursor-not-allowed"
            />
          </div>
        </div>
      </Card>

      {/* Preferências de Estudo */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-white">
              Preferências de Estudo
            </h2>
            <p className="text-sm text-text-secondary">
              Configure sua agenda de estudos
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Meta Diária */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Meta diaria de estudo: {formatHours(settings.dailyGoalHours)}
            </label>
            <input
              type="range"
              min="1"
              max="12"
              step="0.5"
              value={settings.dailyGoalHours}
              onChange={(e) => handleDailyGoalChange(Number(e.target.value))}
              className="w-full accent-neon-purple"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>1h</span>
              <span>12h</span>
            </div>
          </div>

          <div className="rounded-xl border border-card-border bg-card-bg/50 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Horas por dia</p>
                <p className="text-xs text-text-muted">
                  Ajuste por dia quando sua rotina variar.
                </p>
              </div>
              <div className="text-xs text-text-secondary">
                Total semanal: <span className="text-white">{formatHours(weeklyTotalHours)}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {weekDays.map((label, index) => {
                const key = weekDayKeys[index];
                const hours = dailyHoursByWeekday[key] ?? 0;
                const isActive = hours > 0;

                return (
                  <div
                    key={label}
                    className="flex flex-col md:flex-row md:items-center gap-3 justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-3"
                  >
                    <button
                      onClick={() => updateDayHours(index, isActive ? 0 : settings.dailyGoalHours)}
                      className={cn(
                        'w-12 h-10 rounded-lg border text-sm transition',
                        isActive
                          ? 'border-neon-purple/60 text-white'
                          : 'border-slate-800 text-text-muted'
                      )}
                    >
                      {label}
                    </button>
                    <div className="flex flex-1 items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={12}
                        step={0.5}
                        value={hours}
                        onChange={(e) => updateDayHours(index, Number(e.target.value))}
                        className={cn(
                          'w-full accent-neon-purple',
                          !isActive && 'opacity-40'
                        )}
                      />
                      <input
                        type="number"
                        min={0}
                        max={12}
                        step={0.5}
                        value={hours}
                        onChange={(e) => updateDayHours(index, Number(e.target.value))}
                        className="input-field w-24"
                      />
                      <span className="text-xs text-text-muted min-w-[52px]">{formatHours(hours)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
              <span>
                Media diaria: <span className="text-white">{formatHours(averageDailyHours)}</span>
              </span>
              <span>
                Dias ativos: <span className="text-white">{activeDayValues.length}</span>
              </span>
            </div>
          </div>

          {/* Janela de Tempo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Horário de Início Preferido
              </label>
              <input
                type="time"
                value={settings.preferredStart}
                onChange={(e) => updateSetting('preferredStart', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Horário de Término Preferido
              </label>
              <input
                type="time"
                value={settings.preferredEnd}
                onChange={(e) => updateSetting('preferredEnd', e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Duração dos Blocos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Duração Máxima do Bloco (min)
              </label>
              <input
                type="number"
                min="30"
                max="180"
                step="15"
                value={settings.maxBlockMinutes}
                onChange={(e) => updateSetting('maxBlockMinutes', Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Duração do Intervalo (min)
              </label>
              <input
                type="number"
                min="5"
                max="30"
                step="5"
                value={settings.breakMinutes}
                onChange={(e) => updateSetting('breakMinutes', Number(e.target.value))}
                className="input-field"
              />
            </div>
          </div>

          {/* Dias de Descanso */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Dias de Descanso (sem agendamento automático)
            </label>
            <div className="flex gap-2">
              {weekDays.map((day, index) => (
                <button
                  key={day}
                  onClick={() => toggleExcludeDay(index)}
                  className={cn(
                    'w-12 h-12 rounded-xl font-medium text-sm transition-all',
                    settings.excludeDays.includes(index)
                      ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50'
                      : 'bg-card-bg text-text-secondary border border-card-border hover:border-neon-purple/30'
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Configurações da IA */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-white">
              Configurações da IA
            </h2>
            <p className="text-sm text-text-secondary">
              Personalize o comportamento da IA e agendamento
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Modo de Dificuldade */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Modo de Dificuldade da IA
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {aiDifficultyOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateSetting('aiDifficulty', option.value)}
                  className={cn(
                    'p-4 rounded-xl text-left transition-all',
                    settings.aiDifficulty === option.value
                      ? 'bg-neon-cyan/20 border-2 border-neon-cyan'
                      : 'bg-card-bg border border-card-border hover:border-neon-cyan/30'
                  )}
                >
                  <div className="font-medium text-white mb-1">{option.label}</div>
                  <div className="text-xs text-text-muted">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Configurações Toggle */}
          <div className="space-y-4">
            {[
              {
                key: 'focusMode' as const,
                label: 'Modo Foco',
                description: 'Minimizar distrações durante as sessões de estudo',
              },
              {
                key: 'autoSchedule' as const,
                label: 'Agendamento Automático',
                description: 'A IA cria automaticamente agendas semanais',
              },
              {
                key: 'smartBreaks' as const,
                label: 'Pausas Inteligentes',
                description: 'A IA sugere pausas com base nos níveis de foco',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 rounded-xl bg-card-bg border border-card-border"
              >
                <div>
                  <div className="font-medium text-white">{item.label}</div>
                  <div className="text-sm text-text-secondary">
                    {item.description}
                  </div>
                </div>
                <button
                  onClick={() => updateSetting(item.key, !settings[item.key])}
                  className={cn(
                    'w-14 h-8 md:w-12 md:h-6 rounded-full transition-all relative',
                    settings[item.key]
                      ? 'bg-neon-cyan'
                      : 'bg-card-border'
                  )}
                >
                  <motion.div
                    layout
                    className={cn(
                      'absolute top-1.5 md:top-1 w-5 h-5 md:w-4 md:h-4 rounded-full bg-white',
                      settings[item.key] ? 'right-1.5 md:right-1' : 'left-1.5 md:left-1'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Notificações */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-white">
              Notificações
            </h2>
            <p className="text-sm text-text-secondary">
              Gerencie suas preferências de notificação
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            {
              key: 'dailyReminder' as const,
              label: 'Lembrete Diário de Estudo',
              description: 'Receba notificações sobre sua agenda diária',
            },
            {
              key: 'streakReminder' as const,
              label: 'Lembrete de Sequência',
              description: 'Avise-me antes da sequência estar em risco',
            },
            {
              key: 'achievementAlerts' as const,
              label: 'Alertas de Conquistas',
              description: 'Notificar quando desbloquear novas conquistas',
            },
            {
              key: 'weeklyReport' as const,
              label: 'Relatório Semanal',
              description: 'Receber resumo semanal de desempenho',
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 rounded-xl bg-card-bg border border-card-border"
            >
              <div>
                <div className="font-medium text-white">{item.label}</div>
                <div className="text-sm text-text-secondary">
                  {item.description}
                </div>
              </div>
              <button
                onClick={() => updateSetting(item.key, !settings[item.key])}
                className={cn(
                  'w-14 h-8 md:w-12 md:h-6 rounded-full transition-all relative',
                  settings[item.key]
                    ? 'bg-orange-500'
                    : 'bg-card-border'
                )}
              >
                <motion.div
                  layout
                  className={cn(
                    'absolute top-1.5 md:top-1 w-5 h-5 md:w-4 md:h-4 rounded-full bg-white',
                    settings[item.key] ? 'right-1.5 md:right-1' : 'left-1.5 md:left-1'
                  )}
                />
              </button>
            </div>
          ))}
          <div className="p-4 rounded-xl bg-card-bg border border-card-border space-y-4">
            <div>
              <div className="font-medium text-white">Som do alarme</div>
              <div className="text-sm text-text-secondary">
                Escolha o som usado quando um bloco terminar
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alarmSoundOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPendingAlarmSound(option.value)}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-left transition',
                    (pendingAlarmSound || 'pulse') === option.value
                      ? 'border-neon-cyan bg-neon-cyan/10 text-white'
                      : 'border-slate-800 text-text-secondary hover:border-neon-cyan/60'
                  )}
                >
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-xs text-text-muted mt-1">{option.description}</div>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => playAlarmPreview(pendingAlarmSound || 'pulse')}
              >
                Ouvir antes
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  updateSetting('alarmSound', pendingAlarmSound || 'pulse');
                  setAlarmApplied(true);
                }}
              >
                {alarmApplied ? 'Aplicado' : 'Aplicar som'}
              </Button>
              <AnimatePresence>
                {alarmApplied && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    className="flex items-center gap-2 text-neon-cyan text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Som aplicado com sucesso
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Card>

      {/* Zona de Perigo */}
      <Card className="border-red-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-white">
              Zona de Perigo
            </h2>
            <p className="text-sm text-text-secondary">
              Ações irreversíveis
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            variant="secondary" 
            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
            onClick={handleResetOnboarding}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Reiniciar Tutorial
          </Button>
          <Button
            variant="secondary"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={handleResetProgress}
          >
            Resetar Todo o Progresso
          </Button>
          <Button variant="secondary" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
            Excluir Conta
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}





