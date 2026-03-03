'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { UserSettings } from '@/types';
import { defaultSettings } from '@/lib/defaultSettings';
import { useLocalStorage } from './useLocalStorage';

type ProgressPayload = {
  subjects: unknown[];
  plannerBlocks: unknown[];
  analytics: Record<string, unknown>;
  studyPrefs: Record<string, unknown>;
  userSettings: UserSettings;
  scheduleRange: { startDate: string; endDate: string } | null;
  dailyLimits: Record<string, number>;
  firstCycleAllSubjects: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export function useServerProgressSync() {
  const { status } = useSession();

  const [subjects, setSubjects] = useLocalStorage<unknown[]>('nexora_subjects', []);
  const [plannerBlocks, setPlannerBlocks] = useLocalStorage<unknown[]>('nexora_planner_blocks', []);
  const [analytics, setAnalytics] = useLocalStorage<Record<string, unknown>>('nexora_analytics', {
    daily: {},
  });
  const [studyPrefs, setStudyPrefs] = useLocalStorage<Record<string, unknown>>('nexora_study_prefs', {
    hoursPerDay: 2,
    daysOfWeek: [1, 2, 3, 4, 5],
    mode: 'random',
    examDate: '',
  });
  const [userSettings, setUserSettings] = useLocalStorage<UserSettings>(
    'nexora_user_settings',
    defaultSettings
  );
  const [scheduleRange, setScheduleRange] = useLocalStorage<
    { startDate: string; endDate: string } | null
  >('nexora_schedule_range', null);
  const [dailyLimits, setDailyLimits] = useLocalStorage<Record<string, number>>(
    'nexora_daily_limits',
    {}
  );
  const [firstCycleAllSubjects, setFirstCycleAllSubjects] = useLocalStorage<boolean>(
    'nexora_first_cycle_all_subjects',
    true
  );

  const [isReadyToSync, setIsReadyToSync] = useState(false);
  const applyingRemoteRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const queuedSaveRef = useRef<{ payload: ProgressPayload; hash: string } | null>(null);
  const lastSavedHashRef = useRef('');

  const payload = useMemo<ProgressPayload>(
    () => ({
      subjects,
      plannerBlocks,
      analytics,
      studyPrefs,
      userSettings,
      scheduleRange,
      dailyLimits,
      firstCycleAllSubjects,
    }),
    [
      analytics,
      dailyLimits,
      firstCycleAllSubjects,
      plannerBlocks,
      scheduleRange,
      studyPrefs,
      subjects,
      userSettings,
    ]
  );

  const payloadRef = useRef<ProgressPayload>(payload);

  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  const persist = useCallback(async (nextPayload: ProgressPayload, hash: string) => {
    if (saveInFlightRef.current) {
      queuedSaveRef.current = { payload: nextPayload, hash };
      return;
    }

    saveInFlightRef.current = true;

    try {
      const response = await fetch('/api/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: nextPayload }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || 'Falha ao sincronizar progresso.');
      }

      lastSavedHashRef.current = hash;
    } catch (error) {
      console.warn('Falha ao sincronizar progresso no servidor:', error);
    } finally {
      saveInFlightRef.current = false;

      const queued = queuedSaveRef.current;
      queuedSaveRef.current = null;

      if (queued && queued.hash !== lastSavedHashRef.current) {
        void persist(queued.payload, queued.hash);
      }
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      setIsReadyToSync(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadProgress = async () => {
      setIsReadyToSync(false);

      try {
        const response = await fetch('/api/progress', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) return;

        const result = await response.json();
        if (!result?.success || !isRecord(result.data) || cancelled) return;

        const data = result.data;
        const source = typeof result.source === 'string' ? result.source : 'unknown';
        const hasSnapshotSource = source === 'snapshot';
        const currentPayload = payloadRef.current;
        const nextPayloadForHash: ProgressPayload = { ...currentPayload };

        const shouldHydrateFallback = <K extends keyof ProgressPayload>(key: K) => {
          if (hasSnapshotSource) return true;
          const currentValue = currentPayload[key];
          if (currentValue == null) return true;
          if (Array.isArray(currentValue)) return currentValue.length === 0;
          if (typeof currentValue === 'object') return Object.keys(currentValue).length === 0;
          return false;
        };

        applyingRemoteRef.current = true;

        if (Array.isArray(data.subjects)) {
          const nextValue = data.subjects as unknown[];
          if (shouldHydrateFallback('subjects')) {
            setSubjects(nextValue);
            nextPayloadForHash.subjects = nextValue;
          }
        }
        if (Array.isArray(data.plannerBlocks)) {
          const nextValue = data.plannerBlocks as unknown[];
          if (shouldHydrateFallback('plannerBlocks')) {
            setPlannerBlocks(nextValue);
            nextPayloadForHash.plannerBlocks = nextValue;
          }
        }
        if (isRecord(data.analytics)) {
          const nextValue = data.analytics as Record<string, unknown>;
          if (shouldHydrateFallback('analytics')) {
            setAnalytics(nextValue);
            nextPayloadForHash.analytics = nextValue;
          }
        }
        if (isRecord(data.studyPrefs)) {
          const nextValue = data.studyPrefs as Record<string, unknown>;
          if (shouldHydrateFallback('studyPrefs')) {
            setStudyPrefs(nextValue);
            nextPayloadForHash.studyPrefs = nextValue;
          }
        }
        if (isRecord(data.userSettings)) {
          const nextValue = data.userSettings as UserSettings;
          if (shouldHydrateFallback('userSettings')) {
            setUserSettings(nextValue);
            nextPayloadForHash.userSettings = nextValue;
          }
        }
        if (
          data.scheduleRange === null ||
          (isRecord(data.scheduleRange) &&
            typeof data.scheduleRange.startDate === 'string' &&
            typeof data.scheduleRange.endDate === 'string')
        ) {
          const nextValue = data.scheduleRange as { startDate: string; endDate: string } | null;
          if (shouldHydrateFallback('scheduleRange')) {
            setScheduleRange(nextValue);
            nextPayloadForHash.scheduleRange = nextValue;
          }
        }
        if (isRecord(data.dailyLimits)) {
          const nextValue = data.dailyLimits as Record<string, number>;
          if (shouldHydrateFallback('dailyLimits')) {
            setDailyLimits(nextValue);
            nextPayloadForHash.dailyLimits = nextValue;
          }
        }
        if (typeof data.firstCycleAllSubjects === 'boolean') {
          const nextValue = data.firstCycleAllSubjects;
          if (shouldHydrateFallback('firstCycleAllSubjects')) {
            setFirstCycleAllSubjects(nextValue);
            nextPayloadForHash.firstCycleAllSubjects = nextValue;
          }
        }

        if (hasSnapshotSource) {
          lastSavedHashRef.current = JSON.stringify(nextPayloadForHash);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Falha ao carregar progresso remoto:', error);
        }
      } finally {
        if (cancelled) return;
        window.setTimeout(() => {
          applyingRemoteRef.current = false;
          setIsReadyToSync(true);
        }, 0);
      }
    };

    void loadProgress();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    setAnalytics,
    setDailyLimits,
    setFirstCycleAllSubjects,
    setPlannerBlocks,
    setScheduleRange,
    setStudyPrefs,
    setSubjects,
    setUserSettings,
    status,
  ]);

  useEffect(() => {
    if (status !== 'authenticated' || !isReadyToSync || applyingRemoteRef.current) {
      return;
    }

    const hash = JSON.stringify(payload);
    if (hash === lastSavedHashRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void persist(payload, hash);
    }, 900);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [isReadyToSync, payload, persist, status]);
}

export default useServerProgressSync;
