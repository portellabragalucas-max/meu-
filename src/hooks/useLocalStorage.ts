'use client';

/**
 * Shared Client Store Hook
 * Keeps state synchronized across components without browser localStorage.
 */

import { useState, useEffect, useCallback } from 'react';

export const LOCAL_STORAGE_SYNC_EVENT = 'nexora-local-storage-sync';

type ClientStoreSyncDetail<T = unknown> = {
  key: string;
  value?: T;
  hasValue: boolean;
};

const clientStore = new Map<string, unknown>();

export function emitLocalStorageSyncEvent<T>(key: string, value: T, hasValue = true) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(LOCAL_STORAGE_SYNC_EVENT, {
      detail: { key, value, hasValue } satisfies ClientStoreSyncDetail<T>,
    })
  );
}

export function getClientStoreSnapshot(keys?: readonly string[]) {
  const entries = keys
    ? keys
        .filter((key) => clientStore.has(key))
        .map((key) => [key, clientStore.get(key)] as const)
    : Array.from(clientStore.entries());

  return entries.reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
}

export function setClientStoreValue<T>(key: string, value: T) {
  const previousValue = clientStore.get(key);
  if (Object.is(previousValue, value)) return false;
  clientStore.set(key, value);
  emitLocalStorageSyncEvent(key, value, true);
  return true;
}

export function setClientStoreEntries(entries: Record<string, unknown>) {
  Object.entries(entries).forEach(([key, value]) => {
    setClientStoreValue(key, value);
  });
}

export function clearClientStoreKeys(keys: readonly string[]) {
  keys.forEach((key) => {
    if (!clientStore.has(key)) return;
    clientStore.delete(key);
    emitLocalStorageSyncEvent(key, undefined, false);
  });
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (clientStore.has(key)) {
      return clientStore.get(key) as T;
    }
    clientStore.set(key, initialValue);
    return initialValue;
  });

  useEffect(() => {
    if (clientStore.has(key)) {
      const value = clientStore.get(key) as T;
      setStoredValue((prev) => (Object.is(prev, value) ? prev : value));
      return;
    }

    clientStore.set(key, initialValue);
    setStoredValue((prev) => (Object.is(prev, initialValue) ? prev : initialValue));
  }, [initialValue, key]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCustomSync = (event: Event) => {
      const customEvent = event as CustomEvent<ClientStoreSyncDetail<T>>;
      if (customEvent.detail?.key !== key) return;

      if (!customEvent.detail.hasValue) {
        setStoredValue((prev) => (Object.is(prev, initialValue) ? prev : initialValue));
        return;
      }
      const nextValue = customEvent.detail.value as T;

      setStoredValue((prev) =>
        Object.is(prev, nextValue) ? prev : nextValue
      );
    };

    window.addEventListener(LOCAL_STORAGE_SYNC_EVENT, handleCustomSync);

    return () => {
      window.removeEventListener(LOCAL_STORAGE_SYNC_EVENT, handleCustomSync);
    };
  }, [initialValue, key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue((prev) => {
        const previousValue = (clientStore.has(key) ? clientStore.get(key) : prev) as T;
        const valueToStore =
          value instanceof Function ? value(previousValue) : value;

        if (Object.is(previousValue, valueToStore)) {
          return prev;
        }

        clientStore.set(key, valueToStore);
        emitLocalStorageSyncEvent(key, valueToStore, true);

        return valueToStore;
      });
    } catch (error) {
      console.warn(`Error setting client store key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;
