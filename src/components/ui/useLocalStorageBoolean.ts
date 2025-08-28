import { useCallback, useEffect, useState } from 'react';

/**
 * Stores a boolean in localStorage with defensive fallbacks.
 */
export function useLocalStorageBoolean(key: string, defaultValue: boolean): [boolean, (next: boolean | ((v: boolean) => boolean)) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return defaultValue;
      return raw === '1' || raw === 'true';
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [key, value]);

  const set = useCallback((next: boolean | ((v: boolean) => boolean)) => {
    setValue((prev) => (typeof next === 'function' ? (next as (v: boolean) => boolean)(prev) : next));
  }, []);

  return [value, set];
}


