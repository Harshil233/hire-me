import { MoonIcon, SunIcon } from '@/components/icons';
import { useThemeStore } from '@/store/theme.store';

/**
 * Flips between light and dark. Choosing either one is an explicit choice, so it stops
 * following the OS from then on — which is what a user pressing this button means.
 */
export const ThemeToggle = (): React.JSX.Element => {
  const resolved = useThemeStore((state) => state.resolved);
  const setPreference = useThemeStore((state) => state.setPreference);
  const isDark = resolved === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark theme"
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => {
        setPreference(isDark ? 'light' : 'dark');
      }}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-fg-muted transition hover:border-border-strong hover:bg-surface-hover hover:text-fg"
    >
      <span className="sr-only">{isDark ? 'Switch to light theme' : 'Switch to dark theme'}</span>
      {isDark ? <MoonIcon className="h-4.5 w-4.5" /> : <SunIcon className="h-4.5 w-4.5" />}
    </button>
  );
};
