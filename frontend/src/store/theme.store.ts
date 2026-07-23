import { create } from 'zustand';

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
/** What is actually painted — `system` always resolves to one of these. */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'hire-me-theme';

const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);

/** Reads the stored choice. A blocked or empty storage simply means "follow the OS". */
export const readStoredPreference = (): ThemePreference => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

export const prefersDark = (): boolean => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
};

export const resolveTheme = (preference: ThemePreference): ResolvedTheme => {
  if (preference === 'system') {
    return prefersDark() ? 'dark' : 'light';
  }
  return preference;
};

/** Paints the choice. The CSS keys off `data-theme`, so this is the whole mechanism. */
export const applyTheme = (theme: ResolvedTheme): void => {
  document.documentElement.dataset.theme = theme;
};

export interface ThemeState {
  readonly preference: ThemePreference;
  readonly resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Re-resolves without changing the choice — used when the OS setting flips. */
  syncWithSystem: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'system',
  resolved: 'light',

  setPreference: (preference) => {
    const resolved = resolveTheme(preference);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // A refused write only costs persistence, never the switch itself.
    }

    applyTheme(resolved);
    set({ preference, resolved });
  },

  syncWithSystem: () => {
    if (get().preference !== 'system') {
      return;
    }
    const resolved = resolveTheme('system');
    applyTheme(resolved);
    set({ resolved });
  },
}));
