import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/render';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  prefersDark,
  readStoredPreference,
  resolveTheme,
  useThemeStore,
} from '@/store/theme.store';
import { ThemeToggle } from '../ThemeToggle';

/** Points `matchMedia` at a fixed answer for `prefers-color-scheme: dark`. */
const setSystemDark = (isDark: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: isDark,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
};

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  useThemeStore.setState({ preference: 'system', resolved: 'light' });
  setSystemDark(false);
});

afterEach(() => {
  window.localStorage.clear();
});

describe('theme resolution', () => {
  it('resolves an explicit preference to itself', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('resolves "system" from the OS setting', () => {
    setSystemDark(true);
    expect(resolveTheme('system')).toBe('dark');

    setSystemDark(false);
    expect(resolveTheme('system')).toBe('light');
  });

  it('paints by stamping data-theme on the document', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

describe('stored preference', () => {
  it('defaults to following the OS when nothing is stored', () => {
    expect(readStoredPreference()).toBe('system');
  });

  it('reads back a stored choice', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredPreference()).toBe('dark');
  });

  it('ignores a value that is not a known preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readStoredPreference()).toBe('system');
  });

  it('falls back to the OS when storage throws', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readStoredPreference()).toBe('system');
    getItem.mockRestore();
  });

  it('treats an unavailable matchMedia as "not dark"', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => {
        throw new Error('unsupported');
      },
    });

    expect(prefersDark()).toBe(false);
  });
});

describe('ThemeToggle', () => {
  it('starts in light and reports itself as an unchecked switch', () => {
    renderWithProviders(<ThemeToggle />);

    expect(screen.getByRole('switch', { name: 'Dark theme' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('switches to dark and paints the document', async () => {
    renderWithProviders(<ThemeToggle />);

    await userEvent.click(screen.getByRole('switch', { name: 'Dark theme' }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
    expect(screen.getByRole('switch', { name: 'Dark theme' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('switches back to light', async () => {
    renderWithProviders(<ThemeToggle />);
    const toggle = screen.getByRole('switch', { name: 'Dark theme' });

    await userEvent.click(toggle);
    await userEvent.click(toggle);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light');
    });
  });

  it('remembers the choice, so a reload keeps it', async () => {
    renderWithProviders(<ThemeToggle />);

    await userEvent.click(screen.getByRole('switch', { name: 'Dark theme' }));

    await waitFor(() => {
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });
  });

  it('still switches when storage refuses the write', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    renderWithProviders(<ThemeToggle />);
    await userEvent.click(screen.getByRole('switch', { name: 'Dark theme' }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
    setItem.mockRestore();
  });
});

describe('theme bootstrap', () => {
  it('restores the stored preference on mount', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    renderWithProviders(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  it('follows the OS when no choice has been made', async () => {
    setSystemDark(true);

    renderWithProviders(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  it('repaints when the OS setting flips while following it', async () => {
    const listeners: (() => void)[] = [];
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((_event: string, handler: () => void) => {
          listeners.push(handler);
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    renderWithProviders(<ThemeToggle />);
    await waitFor(() => {
      expect(listeners.length).toBeGreaterThan(0);
    });

    // The OS goes dark, then tells everyone who is listening.
    setSystemDark(true);
    listeners.forEach((handler) => {
      handler();
    });

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  it('mounts cleanly where matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => {
        throw new Error('unsupported');
      },
    });

    expect(() => {
      renderWithProviders(<ThemeToggle />);
    }).not.toThrow();
    expect(screen.getByRole('switch', { name: 'Dark theme' })).toBeInTheDocument();
  });

  it('re-resolves when the OS setting flips, but only while following it', () => {
    setSystemDark(true);
    useThemeStore.setState({ preference: 'system', resolved: 'light' });

    useThemeStore.getState().syncWithSystem();
    expect(useThemeStore.getState().resolved).toBe('dark');

    // An explicit choice wins: a later OS change must not override it.
    useThemeStore.setState({ preference: 'light', resolved: 'light' });
    useThemeStore.getState().syncWithSystem();
    expect(useThemeStore.getState().resolved).toBe('light');
  });
});
