'use client';

/**
 * StudyBlockSessionModal Component
 * Cronometro dedicado para um bloco de estudo
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Square, CheckCircle2, Coffee } from 'lucide-react';
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
  const [timers, setTimers] = useLocalStorage<Record<string, { remaining: number; state: SessionState }>>(
    'nexora_session_timers',
    {}
  );
  const [userSettings] = useLocalStorage<UserSettings>('nexora_user_settings', defaultSettings);
  const timersRef = useRef(timers);
  const initialTotalRef = useRef(totalSeconds);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  useEffect(() => {
    if (!isOpen || !block) return;
    initialTotalRef.current = totalSeconds;
    const saved = timersRef.current[block.id];
    if (saved && saved.remaining > 0) {
      setTimeRemaining(saved.remaining);
      setSessionState(saved.state === 'completed' ? 'ready' : saved.state);
    } else {
      setTimeRemaining(totalSeconds);
      setSessionState('ready');
    }
    setCompletedOnce(false);
  }, [isOpen, totalSeconds, block]);

  useEffect(() => {
    if (!block) return;
    setTimers((prev) => ({
      ...prev,
      [block.id]: { remaining: timeRemaining, state: sessionState },
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

  useEffect(() => {
    if (sessionState !== 'running') return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishSession(initialTotalRef.current, 'auto');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionState, block, onComplete, completedOnce, onClose, finishSession]);

  if (!isOpen || !block) return null;

  const subjectName = block.isBreak ? 'Intervalo' : block.subject?.name || 'Sessão de Estudo';

  return (
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
          className="app-modal-panel !w-[min(320px,calc(100vw-24px))] !max-w-[min(320px,calc(100vw-24px))] sm:!w-[min(360px,calc(100vw-32px))] sm:!max-w-[min(360px,calc(100vw-32px))]"
        >
          <Card className="relative overflow-hidden p-2.5 sm:p-4" padding="none">
            <button
              onClick={onClose}
              className="absolute right-2.5 top-2.5 rounded-lg p-1 text-text-muted transition-colors hover:bg-white/5 hover:text-white sm:right-4 sm:top-4 sm:p-2"
              aria-label="Fechar"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <div className="space-y-2.5 text-center sm:space-y-3">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-neon-blue/20 sm:h-14 sm:w-14 sm:rounded-2xl">
                {block.isBreak ? (
                  <Coffee className="h-4 w-4 text-neon-cyan sm:h-6 sm:w-6" />
                ) : (
                  <Play className="h-4 w-4 text-neon-blue sm:h-6 sm:w-6" />
                )}
              </div>
              <div>
                <h2 className="break-words text-lg font-heading font-bold text-white sm:text-2xl">
                  {subjectName}
                </h2>
                <p className="text-[11px] text-text-secondary sm:text-sm">
                  Duração planejada: {formatDuration(block.durationMinutes)}
                </p>
              </div>

              <div className="text-[2.2rem] font-heading font-bold leading-none text-white sm:text-4xl">
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
                    onClick={() => {
                      ensureAudioContext();
                      setSessionState('running');
                    }}
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
                    onClick={() =>
                      setSessionState((prev) => (prev === 'running' ? 'paused' : 'running'))
                    }
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
  );
}
