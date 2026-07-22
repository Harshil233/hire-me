import { create } from 'zustand';

import type { Role } from '@/config/constants';

export interface SessionUser {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
}

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

export interface AuthState {
  /** Held in memory only — never in localStorage, so XSS cannot read it. */
  accessToken: string | null;
  user: SessionUser | null;
  status: SessionStatus;
  setSession: (user: SessionUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'unknown',

  setSession: (user, accessToken) => {
    set({ user, accessToken, status: 'authenticated' });
  },

  setAccessToken: (accessToken) => {
    set({ accessToken });
  },

  clearSession: () => {
    set({ user: null, accessToken: null, status: 'anonymous' });
  },
}));

/** Non-reactive accessors for the HTTP interceptors, which live outside React. */
export const authTokenStore = {
  get: (): string | null => useAuthStore.getState().accessToken,
  set: (accessToken: string): void => {
    useAuthStore.getState().setAccessToken(accessToken);
  },
  clear: (): void => {
    useAuthStore.getState().clearSession();
  },
};
