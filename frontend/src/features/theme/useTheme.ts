import { useEffect } from 'react';

import {
  applyTheme,
  readStoredPreference,
  resolveTheme,
  useThemeStore,
  type ResolvedTheme,
  type ThemePreference,
} from '@/store/theme.store';

export interface UseThemeResult {
  readonly preference: ThemePreference;
  readonly resolved: ResolvedTheme;
  readonly setPreference: (preference: ThemePreference) => void;
}

/**
 * Restores the stored theme on mount and keeps `system` in step with the OS.
 * Mounted once by the app shell; every other consumer just reads the store.
 */
export const useTheme = (): UseThemeResult => {
  const preference = useThemeStore((state) => state.preference);
  const resolved = useThemeStore((state) => state.resolved);
  const setPreference = useThemeStore((state) => state.setPreference);
  const syncWithSystem = useThemeStore((state) => state.syncWithSystem);

  useEffect(() => {
    const stored = readStoredPreference();
    applyTheme(resolveTheme(stored));
    useThemeStore.setState({ preference: stored, resolved: resolveTheme(stored) });
  }, []);

  useEffect(() => {
    let query: MediaQueryList;

    try {
      query = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }

    const handleChange = (): void => {
      syncWithSystem();
    };

    query.addEventListener('change', handleChange);
    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, [syncWithSystem]);

  return { preference, resolved, setPreference };
};
