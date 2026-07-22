import type { ApplicationStatus } from '@/config/constants';

/**
 * Named status values for the screens, mirroring the API contract. Declared once here so
 * no component compares against a bare string (CLAUDE.md §8).
 */
export const APPLICATION_STATUSES_UI = {
  APPLIED: 'applied',
  SHORTLISTED: 'shortlisted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const satisfies Record<string, ApplicationStatus>;
