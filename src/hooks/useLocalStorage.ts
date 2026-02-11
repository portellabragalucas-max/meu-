'use client';

/**
 * useLocalStorage Hook
 * Persist state in localStorage with SSR support
 */

import { useState, useEffect, useCallback } from 'react';

const LOCAL_STORAGE_SYNC_EVENT = 'nexora-local-storage-sync';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      if (!event.newValue) {
        setStoredValue((prev) => (Object.is(prev, initialValue) ? prev : initialValue));
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue);
        setStoredValue((prev) => (Object.is(prev, parsed) ? prev : parsed));
      } catch (error) {
        console.warn(`Error parsing localStorage key "${key}":`, error);
      }
    };

    const handleCustomSync = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string; value: T }>;
      if (customEvent.detail?.key !== key) return;
      setStoredValue((prev) =>
        Object.is(prev, customEvent.detail.value) ? prev : customEvent.detail.value
      );
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(LOCAL_STORAGE_SYNC_EVENT, handleCustomSync);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(LOCAL_STORAGE_SYNC_EVENT, handleCustomSync);
    };
  }, [initialValue, key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue((prev) => {
        const valueToStore =
          value instanceof Function ? value(prev) : value;

        if (Object.is(prev, valueToStore)) {
          return prev;
        }

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          window.dispatchEvent(
            new CustomEvent(LOCAL_STORAGE_SYNC_EVENT, {
              detail: { key, value: valueToStore },
            })
          );
        }

        return valueToStore;
      });
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;
