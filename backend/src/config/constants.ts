/**
 * Application-wide frozen constants. No magic numbers or bare strings are allowed
 * in business logic (CLAUDE.md §8).
 */

/* -------------------------------------------------------------------------- */
/* Roles & enumerations                                                        */
/* -------------------------------------------------------------------------- */

export const ROLE_VALUES = ['candidate', 'hr'] as const;
export type Role = (typeof ROLE_VALUES)[number];
export const ROLES = {
  CANDIDATE: 'candidate',
  HR: 'hr',
} as const satisfies Record<string, Role>;

export const GENDER_VALUES = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export type Gender = (typeof GENDER_VALUES)[number];

export const JOB_TYPE_VALUES = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'freelance',
] as const;
export type JobType = (typeof JOB_TYPE_VALUES)[number];

/** Filterable job category. `title` stays free text for the headline. */
export const JOB_ROLE_VALUES = [
  'engineering',
  'design',
  'product',
  'sales',
  'marketing',
  'hr',
  'finance',
  'operations',
  'other',
] as const;
export type JobRole = (typeof JOB_ROLE_VALUES)[number];

export const WORK_MODE_VALUES = ['onsite', 'hybrid', 'remote'] as const;
export type WorkMode = (typeof WORK_MODE_VALUES)[number];

export const JOB_STATUS_VALUES = ['draft', 'published', 'closed'] as const;
export type JobStatus = (typeof JOB_STATUS_VALUES)[number];
export const JOB_STATUSES = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CLOSED: 'closed',
} as const satisfies Record<string, JobStatus>;

/**
 * Legal job status moves. A frozen map keeps the rule declarative instead of an
 * `if`-chain in the service (CLAUDE.md §3, OCP).
 */
export const JOB_STATUS_TRANSITIONS: Readonly<Record<JobStatus, readonly JobStatus[]>> =
  Object.freeze({
    draft: ['published', 'closed'],
    published: ['closed'],
    closed: ['published'],
  });

export const COMPANY_ROLE_VALUES = ['owner', 'member'] as const;
export type CompanyRole = (typeof COMPANY_ROLE_VALUES)[number];
export const COMPANY_ROLES = {
  OWNER: 'owner',
  MEMBER: 'member',
} as const satisfies Record<string, CompanyRole>;

export const FILE_KIND_VALUES = ['profile_pic', 'resume', 'company_logo'] as const;
export type FileKind = (typeof FILE_KIND_VALUES)[number];
export const FILE_KINDS = {
  PROFILE_PIC: 'profile_pic',
  RESUME: 'resume',
  COMPANY_LOGO: 'company_logo',
} as const satisfies Record<string, FileKind>;

/* -------------------------------------------------------------------------- */
/* Collections                                                                 */
/* -------------------------------------------------------------------------- */

export const COLLECTIONS = {
  USERS: 'users',
  REFRESH_TOKENS: 'refresh_tokens',
  CANDIDATE_PROFILES: 'candidate_profiles',
  HR_PROFILES: 'hr_profiles',
  COMPANIES: 'companies',
  EXPERIENCES: 'experiences',
  EDUCATIONS: 'educations',
  CERTIFICATIONS: 'certifications',
  PROJECTS: 'projects',
  FILES: 'files',
  JOBS: 'jobs',
} as const;

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

/** `MAX_PAGE_SIZE` is a hard ceiling: an uncapped page size is a DoS vector. */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/* -------------------------------------------------------------------------- */
/* Validation limits                                                           */
/* -------------------------------------------------------------------------- */

export const VALIDATION_LIMITS = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MAX_LENGTH: 60,
  EMAIL_MAX_LENGTH: 254,
  SHORT_TEXT_MAX_LENGTH: 120,
  DESCRIPTION_MAX_LENGTH: 2000,
  ADDRESS_MAX_LENGTH: 300,
  LIST_MAX_ITEMS: 50,
  LIST_ITEM_MAX_LENGTH: 50,
  MOBILE_MIN_DIGITS: 7,
  MOBILE_MAX_DIGITS: 15,
  MIN_AGE_YEARS: 16,
  MAX_AGE_YEARS: 100,
  MAX_CTC: 1_000_000_000,
  MAX_EXPERIENCE_YEARS: 60,
} as const;

export const CTC_CURRENCY = 'INR' as const;

/* -------------------------------------------------------------------------- */
/* Files                                                                       */
/* -------------------------------------------------------------------------- */

export const ALLOWED_MIME_TYPES: Readonly<Record<FileKind, readonly string[]>> = Object.freeze({
  profile_pic: ['image/png', 'image/jpeg', 'image/webp'],
  company_logo: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  resume: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
});

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export const REFRESH_COOKIE_NAME = 'hire_me_refresh' as const;
export const REFRESH_COOKIE_PATH = '/api/v1' as const;
export const AUTH_HEADER = 'authorization' as const;
export const BEARER_PREFIX = 'Bearer ' as const;
export const REQUEST_ID_HEADER = 'x-request-id' as const;

/* -------------------------------------------------------------------------- */
/* Profile completion weights — must total 100 per role                        */
/* -------------------------------------------------------------------------- */

export const CANDIDATE_COMPLETION_WEIGHTS = {
  name: 10,
  profilePic: 5,
  mobile: 10,
  gender: 5,
  dob: 5,
  currentLocation: 5,
  preferredLocations: 5,
  skills: 10,
  jobTypes: 5,
  expectedCtc: 5,
  resume: 10,
  experience: 10,
  education: 10,
  project: 3,
  certification: 2,
} as const;

export const HR_COMPLETION_WEIGHTS = {
  name: 20,
  profilePic: 10,
  designation: 10,
  mobile: 15,
  gender: 5,
  dob: 5,
  company: 15,
  companyDescription: 10,
  companyLogo: 5,
  companyWebsite: 5,
} as const;

export const API_PREFIX = '/api/v1' as const;
