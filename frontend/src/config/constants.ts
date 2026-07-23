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

export const JOB_ROLE_LABELS: Readonly<Record<JobRole, string>> = Object.freeze({
  engineering: 'Engineering',
  design: 'Design',
  product: 'Product',
  sales: 'Sales',
  marketing: 'Marketing',
  hr: 'HR',
  finance: 'Finance',
  operations: 'Operations',
  other: 'Other',
});

export const WORK_MODE_VALUES = ['onsite', 'hybrid', 'remote'] as const;
export type WorkMode = (typeof WORK_MODE_VALUES)[number];

export const WORK_MODE_LABELS: Readonly<Record<WorkMode, string>> = Object.freeze({
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
});

export const JOB_STATUS_VALUES = ['draft', 'published', 'closed'] as const;
export type JobStatus = (typeof JOB_STATUS_VALUES)[number];

export const JOB_STATUS_LABELS: Readonly<Record<JobStatus, string>> = Object.freeze({
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
});

export const JOBS_PAGE_SIZE = 20;

export const APPLICATION_STATUS_VALUES = [
  'applied',
  'shortlisted',
  'rejected',
  'withdrawn',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUS_VALUES)[number];

export const APPLICATION_STATUS_LABELS: Readonly<Record<ApplicationStatus, string>> =
  Object.freeze({
    applied: 'Applied',
    shortlisted: 'Shortlisted',
    rejected: 'Not selected',
    withdrawn: 'Withdrawn',
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
  JOBS: '/jobs',
  JOB_DETAIL: '/jobs/:id',
  CANDIDATES: '/candidates',
  CANDIDATE_DETAIL: '/candidates/:userId',
  HR_JOBS: '/hr/jobs',
  HR_JOB_APPLICANTS: '/hr/jobs/:id/applicants',
  APPLICATIONS: '/applications',
  ROOT: '/',
} as const;

/**
 * Where each role lands after signing in: the thing they came to look for. A
 * candidate wants roles; an employer wants people.
 */
export const landingPathFor = (role: Role): string =>
  role === ROLES.HR ? ROUTES.CANDIDATES : ROUTES.JOBS;

/** Builds concrete paths from the `:id` patterns above. */
export const jobDetailPath = (id: string): string => `${ROUTES.JOBS}/${id}`;
export const jobApplicantsPath = (id: string): string => `${ROUTES.HR_JOBS}/${id}/applicants`;
export const candidateDetailPath = (userId: string): string =>
  `${ROUTES.CANDIDATES}/${userId}`;

/** Query keys for the server-state cache, declared once to avoid typos. */
export const QUERY_KEYS = {
  session: ['session'] as const,
  profile: ['profile'] as const,
  section: (resource: string) => ['section', resource] as const,
  file: (fileId: string) => ['file', fileId] as const,
  jobs: (filters: Readonly<Record<string, unknown>>) => ['jobs', filters] as const,
  myJobs: (filters: Readonly<Record<string, unknown>>) => ['jobs', 'mine', filters] as const,
  job: (id: string) => ['job', id] as const,
  similarJobs: (id: string) => ['job', id, 'similar'] as const,
  myApplications: (filters: Readonly<Record<string, unknown>>) =>
    ['applications', 'mine', filters] as const,
  jobApplicants: (jobId: string, filters: Readonly<Record<string, unknown>>) =>
    ['applications', 'job', jobId, filters] as const,
  notifications: ['notifications'] as const,
  candidates: (filters: Readonly<Record<string, unknown>>) => ['candidates', filters] as const,
  candidate: (userId: string) => ['candidate', userId] as const,
};
