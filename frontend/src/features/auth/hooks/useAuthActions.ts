import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useAuthStore } from '@/store/auth.store';
import type { Role } from '@/config/constants';
import type { ApiError } from '@/services/api-error';
import { authApi, type IAuthApi } from '../api/auth.api';
import type {
  AuthSessionResponse,
  CandidateRegisterFormValues,
  HrRegisterFormValues,
  LoginFormValues,
} from '../schemas/auth.schema';

type SessionMutation<TValues> = UseMutationResult<AuthSessionResponse, ApiError, TValues>;

/** Stores the session and clears any cached server state from a previous account. */
const useSessionMutation = <TValues>(
  mutationFn: (values: TValues) => Promise<AuthSessionResponse>,
): SessionMutation<TValues> => {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();

  return useMutation<AuthSessionResponse, ApiError, TValues>({
    mutationFn,
    onSuccess: (session) => {
      queryClient.clear();
      setSession(session.user, session.accessToken);
    },
  });
};

/** The role travels with the submission, so it always matches the tab that was active. */
export interface LoginRequest {
  readonly role: Role;
  readonly values: LoginFormValues;
}

export const useLogin = (api: IAuthApi = authApi): SessionMutation<LoginRequest> =>
  useSessionMutation((request) => api.login(request.role, request.values));

export const useRegisterCandidate = (
  api: IAuthApi = authApi,
): SessionMutation<CandidateRegisterFormValues> =>
  useSessionMutation((values) => api.registerCandidate(values));

export const useRegisterHr = (api: IAuthApi = authApi): SessionMutation<HrRegisterFormValues> =>
  useSessionMutation((values) => api.registerHr(values));

export const useLogout = (api: IAuthApi = authApi): UseMutationResult<void, ApiError, void> => {
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();

  return useMutation<void, ApiError>({
    mutationFn: () => api.logout(),
    // The local session is dropped even if the server call fails — the user asked to
    // sign out, and the refresh cookie has a hard expiry regardless.
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
};
