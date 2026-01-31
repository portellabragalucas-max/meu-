'use client';

/**
 * useOnboarding Hook
 * Gerencia o estado do onboarding e primeiro uso
 */

import { useState, useEffect } from 'react';

interface OnboardingState {
  hasCompletedWelcome: boolean;
  hasCompletedTutorial: boolean;
  hasAddedFirstSubject: boolean;
  tutorialStep: number;
}

const STORAGE_KEY = 'nexora_onboarding';

const defaultState: OnboardingState = {
  hasCompletedWelcome: false,
  hasCompletedTutorial: false,
  hasAddedFirstSubject: false,
  tutorialStep: 0,
};

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setState(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Erro ao carregar estado do onboarding:', error);
    }
    setIsLoading(false);
  }, []);

  // Save state to localStorage
  const saveState = (newState: Partial<OnboardingState>) => {
    const updated = { ...state, ...newState };
    setState(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Erro ao salvar estado do onboarding:', error);
    }
  };

  // Check if user is a first-time user
  const isFirstTimeUser = !state.hasCompletedWelcome;

  // Check if should show welcome modal
  const shouldShowWelcome = !isLoading && !state.hasCompletedWelcome;

  // Check if should show tutorial
  const shouldShowTutorial = !isLoading && state.hasCompletedWelcome && !state.hasCompletedTutorial;

  // Complete welcome
  const completeWelcome = () => {
    saveState({ hasCompletedWelcome: true });
  };

  // Complete tutorial
  const completeTutorial = () => {
    saveState({ hasCompletedTutorial: true });
  };

  // Skip tutorial
  const skipTutorial = () => {
    saveState({ hasCompletedTutorial: true });
  };

  // Mark first subject added
  const markFirstSubjectAdded = () => {
    saveState({ hasAddedFirstSubject: true });
  };

  // Reset onboarding (for testing)
  const resetOnboarding = () => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    isLoading,
    isFirstTimeUser,
    shouldShowWelcome,
    shouldShowTutorial,
    hasAddedFirstSubject: state.hasAddedFirstSubject,
    completeWelcome,
    completeTutorial,
    skipTutorial,
    markFirstSubjectAdded,
    resetOnboarding,
  };
}

export default useOnboarding;
