'use client';

/**
 * TutorialTooltip Component
 * Tooltips de tutorial passo a passo
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';

export interface TutorialStep {
  id: string;
  target: string; // CSS selector
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialTooltipProps {
  steps: TutorialStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function TutorialTooltip({
  steps,
  isActive,
  onComplete,
  onSkip,
}: TutorialTooltipProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Calculate tooltip position based on target element
  useEffect(() => {
    if (!isActive || !step) return;

    const targetElement = document.querySelector(step.target);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const tooltipWidth = 320;
      const tooltipHeight = 180;
      const padding = 16;

      let top = 0;
      let left = 0;

      switch (step.position || 'bottom') {
        case 'top':
          top = rect.top - tooltipHeight - padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - padding;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + padding;
          break;
      }

      // Keep tooltip within viewport
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

      setPosition({ top, left });

      // Highlight target element
      targetElement.classList.add('tutorial-highlight');
      return () => {
        targetElement.classList.remove('tutorial-highlight');
      };
    }
  }, [isActive, step, currentStep]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isActive || !step) return null;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40 pointer-events-none"
      />

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 50,
          }}
          className="w-80"
        >
          <div className="glass-card p-5 shadow-lg shadow-neon-blue/20">
            {/* Close button */}
            <button
              onClick={onSkip}
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-1 mb-3">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-1 rounded-full transition-all',
                    index === currentStep
                      ? 'w-6 bg-neon-blue'
                      : index < currentStep
                      ? 'w-2 bg-neon-cyan'
                      : 'w-2 bg-card-border'
                  )}
                />
              ))}
            </div>

            {/* Content */}
            <h4 className="text-lg font-heading font-bold text-white mb-2">
              {step.title}
            </h4>
            <p className="text-sm text-text-secondary mb-4">
              {step.description}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">
                {currentStep + 1} de {steps.length}
              </span>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button variant="ghost" size="sm" onClick={handlePrev}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="primary" size="sm" onClick={handleNext}>
                  {isLastStep ? 'Concluir' : 'Próximo'}
                  {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Arrow pointer */}
          <div
            className={cn(
              'absolute w-3 h-3 bg-card-bg border-card-border rotate-45',
              step.position === 'top' && 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-r border-b',
              step.position === 'bottom' && 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-t',
              step.position === 'left' && 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-t border-r',
              step.position === 'right' && 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-b border-l',
              !step.position && 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-t'
            )}
          />
        </motion.div>
      </AnimatePresence>

      {/* CSS for highlight effect */}
      <style jsx global>{`
        .tutorial-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(0, 180, 255, 0.3),
                      0 0 20px rgba(0, 180, 255, 0.2);
          border-radius: 12px;
        }
      `}</style>
    </>
  );
}

// Default tutorial steps for the dashboard
export const dashboardTutorialSteps: TutorialStep[] = [
  {
    id: 'sidebar',
    target: '[data-tutorial="sidebar"]',
    title: 'Menu de Navegação',
    description: 'Use a sidebar para navegar entre as diferentes seções do app. Você pode recolhê-la clicando no botão abaixo.',
    position: 'right',
  },
  {
    id: 'stats',
    target: '[data-tutorial="stats"]',
    title: 'Suas Estatísticas',
    description: 'Aqui você vê um resumo do seu progresso: horas estudadas, pontuação de foco, sequência de dias e tarefas concluídas.',
    position: 'bottom',
  },
  {
    id: 'chart',
    target: '[data-tutorial="chart"]',
    title: 'Progresso Semanal',
    description: 'Este gráfico mostra suas horas de estudo ao longo da semana. Barras verdes indicam dias em que você atingiu a meta!',
    position: 'bottom',
  },
  {
    id: 'plan',
    target: '[data-tutorial="plan"]',
    title: 'Plano do Dia',
    description: 'Veja e gerencie os blocos de estudo programados para hoje. Inicie sessões diretamente daqui!',
    position: 'left',
  },
  {
    id: 'level',
    target: '[data-tutorial="level"]',
    title: 'Seu Nível',
    description: 'Ganhe XP completando sessões de estudo. Suba de nível e desbloqueie conquistas!',
    position: 'left',
  },
];
