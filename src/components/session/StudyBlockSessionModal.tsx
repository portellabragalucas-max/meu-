'use client';

/**
 * StudyBlockSessionModal Component
 * Cronometro dedicado para um bloco de estudo
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Play, CheckCircle2, Coffee } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatDuration } from '@/lib/utils';
import type { StudyBlock, UserSettings } from '@/types';
import { useLocalStorage } from '@/hooks';
import { defaultSettings } from '@/lib/defaultSettings';

interface StudyBlockSessionModalProps {
  isOpen: boolean;
  block: StudyBlock | null;
  onClose: () => void;
  onComplete?: (blockId: string, minutesSpent: number) => void;
}

type SessionState = 'ready' | 'running' | 'paused' | 'completed';
type SessionTimerSnapshot = {
  remaining: number;
  state: SessionState;
  runningUntil?: number | null;
  savedAt?: number;
};

export default function StudyBlockSessionModal({
  isOpen,
  block,
  onClose,
  onComplete,
}: StudyBlockSessionModalProps) {
  const totalSeconds = block ? block.durationMinutes * 60 : 0;
  const [timeRemaining, setTimeRemaining] = useState(totalSeconds);
  const [sessionState, setSessionState] = useState<SessionState>('ready');
  const [completedOnce, setCompletedOnce] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [timers, setTimers] = useLocalStorage<Record<string, SessionTimerSnapshot>>(
    'nexora_session_timers',
    {}
  );
  const [userSettings] = useLocalStorage<UserSettings>('nexora_user_settings', defaultSettings);
  const timersRef = useRef(timers);
  const initialTotalRef = useRef(totalSeconds);
  const runningUntilRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !block) return;
    initialTotalRef.current = totalSeconds;
    const saved = timersRef.current[block.id];
    if (saved && saved.remaining > 0) {
      const nextState: SessionState = saved.state === 'completed' ? 'ready' : saved.state;
      if (nextState === 'running') {
        const fallbackRunningUntil = (saved.savedAt || Date.now()) + (saved.remaining * 1000);
        runningUntilRef.current =
          typeof saved.runningUntil === 'number' ? saved.runningUntil : fallbackRunningUntil;
        const liveRemaining = Math.max(0, Math.ceil((runningUntilRef.current - Date.now()) / 1000));
        setTimeRemaining(liveRemaining);
        setSessionState('running');
      } else {
        runningUntilRef.current = null;
        setTimeRemaining(saved.remaining);
        setSessionState(nextState);
      }
    } else {
      runningUntilRef.current = null;
      setTimeRemaining(totalSeconds);
      setSessionState('ready');
    }
    setCompletedOnce(false);
  }, [isOpen, totalSeconds, block]);

  useEffect(() => {
    if (!block) return;
    const runningUntil =
      sessionState === 'running'
        ? (runningUntilRef.current ?? (Date.now() + (timeRemaining * 1000)))
        : null;
    if (sessionState === 'running') {
      runningUntilRef.current = runningUntil;
    }
    setTimers((prev) => ({
      ...prev,
      [block.id]: { remaining: timeRemaining, state: sessionState, runningUntil, savedAt: Date.now() },
    }));
  }, [block, timeRemaining, sessionState, setTimers]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const ensureAudioContext = useCallback(() => {
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
  }, []);

  const playAlarm = useCallback(() => {
    try {
      ensureAudioContext();
      if (!audioRef.current) return;
      const context = audioRef.current;
      const now = context.currentTime;
      const sound = userSettings.alarmSound || 'pulse';

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
        const repeats = 4; // ~5s total
        for (let i = 0; i < repeats; i += 1) {
          const start = now + i * (duration + gap);
          scheduleBeep(start, duration, 880, 'sine');
        }
        return;
      }

      if (sound === 'chime') {
        const cycle = 0.9;
        const repeats = 6; // ~5.4s total
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
        const repeats = 12; // ~4.8s + tail
        for (let i = 0; i < repeats; i += 1) {
          const start = now + i * (duration + gap);
          scheduleBeep(start, duration, 520, 'sine');
        }
        return;
      }

      // pulse (default)
      const beepDuration = 0.24;
      const gap = 0.08;
      const repeats = 16; // ~5.1s
      for (let i = 0; i < repeats; i += 1) {
        const start = now + i * (beepDuration + gap);
        scheduleBeep(start, beepDuration, 880, 'square');
      }
    } catch (error) {
      console.warn('Erro ao tocar alarme:', error);
    }
  }, [ensureAudioContext, userSettings.alarmSound]);

  const finishSession = useCallback(
    (spentSeconds: number, mode: 'auto' | 'manual' = 'manual') => {
      if (completedOnce) return;
      runningUntilRef.current = null;
      const minutesSpent =
        mode === 'auto'
          ? Math.max(1, block?.durationMinutes || 0)
          : Math.max(1, Math.round(spentSeconds / 60));
      setCompletedOnce(true);
      setSessionState('completed');
      playAlarm();
      if (block && onComplete) {
        onComplete(block.id, minutesSpent);
      }
      setTimeout(() => {
        onClose();
      }, 400);
    },
    [completedOnce, block, onComplete, onClose, playAlarm]
  );

  const startOrResumeSession = useCallback(() => {
    ensureAudioContext();
    runningUntilRef.current = Date.now() + (Math.max(0, timeRemaining) * 1000);
    setSessionState('running');
  }, [ensureAudioContext, timeRemaining]);

  const pauseOrResumeSession = useCallback(() => {
    if (sessionState === 'running') {
      if (runningUntilRef.current) {
        const liveRemaining = Math.max(0, Math.ceil((runningUntilRef.current - Date.now()) / 1000));
        setTimeRemaining(liveRemaining);
      }
      runningUntilRef.current = null;
      setSessionState('paused');
      return;
    }

    if (sessionState === 'paused') {
      runningUntilRef.current = Date.now() + (Math.max(0, timeRemaining) * 1000);
      setSessionState('running');
    }
  }, [sessionState, timeRemaining]);

  useEffect(() => {
    if (sessionState !== 'running') return;

    if (!runningUntilRef.current) {
      runningUntilRef.current = Date.now() + (Math.max(0, timeRemaining) * 1000);
    }

    const tick = () => {
      if (!runningUntilRef.current) return;
      const liveRemaining = Math.max(0, Math.ceil((runningUntilRef.current - Date.now()) / 1000));
      setTimeRemaining(liveRemaining);
      if (liveRemaining <= 0) {
        finishSession(initialTotalRef.current, 'auto');
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [sessionState, timeRemaining, finishSession]);

  if (!isOpen || !block || !mounted) return null;

  const subjectName = block.isBreak ? 'Intervalo' : block.subject?.name || 'Sessão de Estudo';

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="app-modal-overlay z-[10020] place-items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="app-modal-panel max-w-[360px] sm:max-w-xl lg:max-w-2xl"
        >
          <Card className="relative overflow-hidden p-3 sm:p-6 lg:p-8" padding="none">
            <button
              onClick={onClose}
              className="absolute right-2.5 top-2.5 rounded-lg p-1 text-text-muted transition-colors hover:bg-white/5 hover:text-white sm:right-4 sm:top-4 sm:p-2"
              aria-label="Fechar"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <div className="space-y-3 text-center sm:space-y-5">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-neon-blue/20 sm:h-16 sm:w-16 sm:rounded-2xl">
                {block.isBreak ? (
                  <Coffee className="h-4 w-4 text-neon-cyan sm:h-7 sm:w-7" />
                ) : (
                  <Play className="h-4 w-4 text-neon-blue sm:h-7 sm:w-7" />
                )}
              </div>
              <div>
                <h2 className="break-words text-lg font-heading font-bold text-white sm:text-3xl">
                  {subjectName}
                </h2>
                <p className="text-xs text-text-secondary sm:text-base">
                  Duração planejada: {formatDuration(block.durationMinutes)}
                </p>
              </div>

              <div className="font-mono text-[2.8rem] font-bold leading-none tracking-[0.04em] text-[#ffb020] sm:text-6xl lg:text-7xl">
                {formatTimer(timeRemaining)}
              </div>

              {sessionState === 'ready' && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="secondary" className="h-9 min-h-0 flex-1 text-xs sm:h-10 sm:text-sm" onClick={onClose}>
                    Fechar
                  </Button>
                  <Button
                    variant="primary"
                    className="h-9 min-h-0 flex-1 text-xs sm:h-10 sm:text-sm"
                    onClick={startOrResumeSession}
                  >
                    Iniciar
                  </Button>
                </div>
              )}

              {(sessionState === 'running' || sessionState === 'paused') && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    className="h-9 min-h-0 flex-1 text-xs sm:h-10 sm:text-sm"
                    onClick={() => finishSession(initialTotalRef.current - timeRemaining, 'manual')}
                  >
                    Concluir agora
                  </Button>
                  <Button
                    variant="primary"
                    className="h-9 min-h-0 flex-1 text-xs sm:h-10 sm:text-sm"
                    onClick={pauseOrResumeSession}
                  >
                    {sessionState === 'running' ? 'Pausar' : 'Continuar'}
                  </Button>
                </div>
              )}

              {sessionState === 'completed' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-neon-cyan">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Sessão concluída</span>
                  </div>
                  <Button
                    variant="primary"
                    className="h-9 min-h-0 w-full text-xs sm:h-10 sm:text-sm"
                    onClick={onClose}
                  >
                    Fechar
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    ,
    document.body
  );
}
