import { beforeEach, describe, expect, it } from 'vitest';

import { ROLES } from '@/config/constants';
import { authTokenStore, useAuthStore } from '../auth.store';

const USER = { id: 'user-1', email: 'ada@example.com', role: ROLES.CANDIDATE };

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, status: 'unknown' });
});

describe('useAuthStore', () => {
  it('starts in the unknown state so the app can attempt a restore', () => {
    const state = useAuthStore.getState();

    expect(state.status).toBe('unknown');
    expect(state.accessToken).toBeNull();
  });

  it('stores a session', () => {
    useAuthStore.getState().setSession(USER, 'token-1');

    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.user).toEqual(USER);
    expect(state.accessToken).toBe('token-1');
  });

  it('replaces only the access token on refresh', () => {
    useAuthStore.getState().setSession(USER, 'token-1');
    useAuthStore.getState().setAccessToken('token-2');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('token-2');
    expect(state.user).toEqual(USER);
    expect(state.status).toBe('authenticated');
  });

  it('clears the session on sign-out', () => {
    useAuthStore.getState().setSession(USER, 'token-1');
    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();
    expect(state.status).toBe('anonymous');
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('never persists the token outside memory', () => {
    useAuthStore.getState().setSession(USER, 'token-1');

    expect(window.localStorage.getItem('accessToken')).toBeNull();
    expect(JSON.stringify(window.localStorage)).not.toContain('token-1');
  });
});

describe('authTokenStore', () => {
  it('bridges the store to the HTTP interceptors', () => {
    expect(authTokenStore.get()).toBeNull();

    useAuthStore.getState().setSession(USER, 'token-1');
    expect(authTokenStore.get()).toBe('token-1');

    authTokenStore.set('token-2');
    expect(useAuthStore.getState().accessToken).toBe('token-2');

    authTokenStore.clear();
    expect(useAuthStore.getState().status).toBe('anonymous');
  });
});
