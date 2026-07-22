import { useEffect } from 'react';

import { useAuthStore } from '@/store/auth.store';
import { authApi, type IAuthApi } from '../api/auth.api';

export interface UseSessionResult {
  readonly isRestoring: boolean;
  readonly isAuthenticated: boolean;
}

/**
 * Restores a session on boot. The access token lives only in memory, so after a reload
 * the app exchanges the httpOnly refresh cookie for a fresh one.
 */
export const useSession = (api: IAuthApi = authApi): UseSessionResult => {
  const status = useAuthStore((state) => state.status);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (status !== 'unknown') {
      return;
    }

    let isActive = true;

    const restore = async (): Promise<void> => {
      try {
        const session = await api.refresh();
        if (isActive) {
          setSession(session.user, session.accessToken);
        }
      } catch {
        if (isActive) {
          clearSession();
        }
      }
    };

    void restore();

    return () => {
      isActive = false;
    };
  }, [status, api, setSession, clearSession]);

  return {
    isRestoring: status === 'unknown',
    isAuthenticated: status === 'authenticated',
  };
};
