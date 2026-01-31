'use client';

/**
 * StudyBlockSessionModal Component
 * Cronometro dedicado para um bloco de estudo
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Square, CheckCircle2, Coffee } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatDuration } from '@/lib/utils';
import type { StudyBlock } from '@/types';
import { useLocalStorage } from '@/hooks';

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
  const timersRef = useRef(timers);
  const initialTotalRef = useRef(totalSeconds);

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

  const finishSession = (spentSeconds: number) => {
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
  };

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
  }, [sessionState, block, onComplete, completedOnce, onClose]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const playAlarm = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.2, context.currentTime);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.9);
      oscillator.onended = () => context.close();
    } catch (error) {
      console.warn('Erro ao tocar alarme:', error);
    }
  };

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
                    onClick={() => setSessionState('running')}
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
