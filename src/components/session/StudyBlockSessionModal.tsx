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
    (spentSeconds: number) => {
      if (completedOnce) return;
      const minutesSpent = Math.max(0, spentSeconds / 60);
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
          finishSession(initialTotalRef.current);
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
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <Card className="relative overflow-hidden" padding="lg">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-neon-blue/20 flex items-center justify-center mx-auto">
                {block.isBreak ? (
                  <Coffee className="w-6 h-6 text-neon-cyan" />
                ) : (
                  <Play className="w-6 h-6 text-neon-blue" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-heading font-bold text-white">
                  {subjectName}
                </h2>
                <p className="text-sm text-text-secondary">
                  Duração planejada: {formatDuration(block.durationMinutes)}
                </p>
              </div>

              <div className="text-4xl font-heading font-bold text-white">
                {formatTimer(timeRemaining)}
              </div>

              {sessionState === 'ready' && (
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={onClose}>
                    Fechar
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
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
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => finishSession(initialTotalRef.current - timeRemaining)}
                  >
                    Finalizar
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
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
                    className="w-full"
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
