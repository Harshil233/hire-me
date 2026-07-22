/**
 * Contract constants mirrored from the API. Duplicated deliberately: the apps are
 * independent and must not import across folders (CLAUDE.md §1).
 */

export const ROLE_VALUES = ['candidate', 'hr'] as const;
export type Role = (typeof ROLE_VALUES)[number];
export const ROLES = { CANDIDATE: 'candidate', HR: 'hr' } as const satisfies Record<string, Role>;

export const GENDER_VALUES = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export type Gender = (typeof GENDER_VALUES)[number];

export const GENDER_LABELS: Readonly<Record<Gender, string>> = Object.freeze({
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
});

export const JOB_TYPE_VALUES = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'freelance',
] as const;
export type JobType = (typeof JOB_TYPE_VALUES)[number];

export const JOB_TYPE_LABELS: Readonly<Record<JobType, string>> = Object.freeze({
  full_time: 'Full time',
  part_time: 'Part time',
  contract: 'Contract',
  internship: 'Internship',
  freelance: 'Freelance',
});

export const FILE_KINDS = {
  PROFILE_PIC: 'profile_pic',
  RESUME: 'resume',
  COMPANY_LOGO: 'company_logo',
} as const;
export type FileKind = (typeof FILE_KINDS)[keyof typeof FILE_KINDS];

export const ACCEPTED_FILE_TYPES: Readonly<Record<FileKind, string>> = Object.freeze({
  profile_pic: 'image/png,image/jpeg,image/webp',
  company_logo: 'image/png,image/jpeg,image/webp,image/svg+xml',
  resume:
    'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
});

export const MAX_UPLOAD_BYTES = 5_242_880;

export const VALIDATION_LIMITS = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MAX_LENGTH: 60,
  SHORT_TEXT_MAX_LENGTH: 120,
  DESCRIPTION_MAX_LENGTH: 2000,
  ADDRESS_MAX_LENGTH: 300,
  LIST_MAX_ITEMS: 50,
  LIST_ITEM_MAX_LENGTH: 50,
  MIN_AGE_YEARS: 16,
  MAX_AGE_YEARS: 100,
  MAX_CTC: 1_000_000_000,
} as const;

export const CTC_CURRENCY = 'INR' as const;

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  ROOT: '/',
} as const;

/** Query keys for the server-state cache, declared once to avoid typos. */
export const QUERY_KEYS = {
  session: ['session'] as const,
  profile: ['profile'] as const,
  section: (resource: string) => ['section', resource] as const,
  file: (fileId: string) => ['file', fileId] as const,
};
