'use client';

/**
 * QuickSessionModal Component
 * Modal para iniciar uma sessão de estudo rápida
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  Square,
  Clock,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Coffee,
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { Button, Card, ProgressBar } from '@/components/ui';

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface QuickSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
}

type SessionState = 'setup' | 'running' | 'paused' | 'break' | 'completed';

export default function QuickSessionModal({
  isOpen,
  onClose,
  subjects,
}: QuickSessionModalProps) {
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [duration, setDuration] = useState(25); // minutos
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [focusScore, setFocusScore] = useState(85);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (sessionState === 'running' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setSessionState('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [sessionState, timeRemaining]);

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular progresso
  const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;

  // Iniciar sessão
  const startSession = () => {
    if (!selectedSubject) return;
    const totalSeconds = duration * 60;
    setTotalTime(totalSeconds);
    setTimeRemaining(totalSeconds);
    setSessionState('running');
  };

  // Pausar/Continuar
  const togglePause = () => {
    setSessionState((prev) => (prev === 'running' ? 'paused' : 'running'));
  };

  // Parar sessão
  const stopSession = () => {
    setSessionState('completed');
  };

  // Resetar
  const resetSession = () => {
    setSessionState('setup');
    setSelectedSubject(null);
    setDuration(25);
    setTimeRemaining(0);
    setTotalTime(0);
  };

  // Fechar modal
  const handleClose = () => {
    if (sessionState === 'running' || sessionState === 'paused') {
      if (confirm('Tem certeza que deseja sair? A sessão será perdida.')) {
        resetSession();
        onClose();
      }
    } else {
      resetSession();
      onClose();
    }
  };

  // Calcular XP ganho
  const calculateXP = () => {
    const minutesStudied = Math.floor((totalTime - timeRemaining) / 60);
    return Math.floor(minutesStudied * (focusScore / 100) * 1.5);
  };

  const durationOptions = [15, 25, 45, 60, 90, 120];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="app-modal-overlay"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="app-modal-panel max-w-lg"
          >
            <Card className="relative overflow-hidden" padding="none">
              {/* Header gradient */}
              <div
                className="h-2"
                style={{
                  background: selectedSubject
                    ? selectedSubject.color
                    : 'linear-gradient(90deg, #00B4FF, #7F00FF)',
                }}
              />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-4 sm:p-8">
                {/* Setup State */}
                {sessionState === 'setup' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-neon-blue" />
                      </div>
                      <h2 className="text-2xl font-heading font-bold text-white mb-2">
                        Sessão Rápida
                      </h2>
                      <p className="text-text-secondary">
                        Configure e comece a estudar agora
                      </p>
                    </div>

                    {/* Seleção de Disciplina */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-text-secondary mb-3">
                        Escolha a disciplina
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {subjects.map((subject) => (
                          <button
                            key={subject.id}
                            onClick={() => setSelectedSubject(subject)}
                            className={cn(
                              'p-3 rounded-xl border text-left transition-all',
                              selectedSubject?.id === subject.id
                                ? 'border-neon-blue bg-neon-blue/10'
                                : 'border-card-border bg-card-bg hover:border-neon-blue/50'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: subject.color }}
                              />
                              <span className="text-sm text-white truncate">
                                {subject.name}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Seleção de Duração */}
                    <div className="mb-8">
                      <label className="block text-sm font-medium text-text-secondary mb-3">
                        Duração da sessão
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {durationOptions.map((mins) => (
                          <button
                            key={mins}
                            onClick={() => setDuration(mins)}
                            className={cn(
                              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                              duration === mins
                                ? 'bg-neon-purple text-white'
                                : 'bg-card-bg border border-card-border text-text-secondary hover:border-neon-purple/50'
                            )}
                          >
                            {formatDuration(mins)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Botão Iniciar */}
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={startSession}
                      disabled={!selectedSubject}
                      leftIcon={<Play className="w-4 h-4" />}
                    >
                      Iniciar Sessão
                    </Button>
                  </motion.div>
                )}

                {/* Running/Paused State */}
                {(sessionState === 'running' || sessionState === 'paused') && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    {/* Disciplina */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: selectedSubject?.color }}
                      />
                      <span className="text-lg text-white font-medium">
                        {selectedSubject?.name}
                      </span>
                    </div>

                    {/* Timer */}
                    <div className="relative mb-8">
                      {/* Circle progress */}
                      <svg className="w-40 h-40 sm:w-48 sm:h-48 mx-auto" viewBox="0 0 200 200">
                        {/* Background circle */}
                        <circle
                          cx="100"
                          cy="100"
                          r="90"
                          fill="none"
                          stroke="rgba(0, 180, 255, 0.1)"
                          strokeWidth="8"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="100"
                          cy="100"
                          r="90"
                          fill="none"
                          stroke="url(#timerGradient)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${progress * 5.65} 565`}
                          transform="rotate(-90 100 100)"
                        />
                        <defs>
                          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#00B4FF" />
                            <stop offset="100%" stopColor="#7F00FF" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Time display */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl sm:text-5xl font-heading font-bold text-white">
                          {formatTime(timeRemaining)}
                        </span>
                        <span className="text-sm text-text-secondary mt-2">
                          {sessionState === 'paused' ? 'Pausado' : 'restantes'}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    {sessionState === 'paused' && (
                      <div className="mb-6 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                        <p className="text-sm text-yellow-400">
                          ⏸️ Sessão pausada
                        </p>
                      </div>
                    )}

                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                      <Button
                        variant="secondary"
                        onClick={stopSession}
                        leftIcon={<Square className="w-4 h-4" />}
                      >
                        Parar
                      </Button>
                      <Button
                        variant="primary"
                        onClick={togglePause}
                        leftIcon={
                          sessionState === 'paused' ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <Pause className="w-4 h-4" />
                          )
                        }
                      >
                        {sessionState === 'paused' ? 'Continuar' : 'Pausar'}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Completed State */}
                {sessionState === 'completed' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-neon-cyan/20 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-neon-cyan" />
                    </div>

                    <h2 className="text-2xl font-heading font-bold text-white mb-2">
                      Sessão Concluída! 🎉
                    </h2>
                    <p className="text-text-secondary mb-8">
                      Ótimo trabalho! Continue assim.
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
                      <div className="p-4 rounded-xl bg-card-bg border border-card-border">
                        <Clock className="w-5 h-5 text-neon-blue mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">
                          {formatDuration(Math.floor((totalTime - timeRemaining) / 60))}
                        </p>
                        <p className="text-xs text-text-muted">Estudado</p>
                      </div>
                      <div className="p-4 rounded-xl bg-card-bg border border-card-border">
                        <Sparkles className="w-5 h-5 text-neon-purple mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">
                          +{calculateXP()}
                        </p>
                        <p className="text-xs text-text-muted">XP Ganho</p>
                      </div>
                      <div className="p-4 rounded-xl bg-card-bg border border-card-border">
                        <BookOpen className="w-5 h-5 text-neon-cyan mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">
                          {focusScore}%
                        </p>
                        <p className="text-xs text-text-muted">Foco</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={handleClose}
                      >
                        Fechar
                      </Button>
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={resetSession}
                        leftIcon={<Play className="w-4 h-4" />}
                      >
                        Nova Sessão
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
