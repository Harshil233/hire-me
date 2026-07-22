import { ROLES } from '@/config/constants';
import type {
  CandidateProfile,
  Company,
  HrProfile,
  ProfileCompletion,
  ProfileView,
} from '@/features/profile/schemas/profile.schema';
import type { Job, Pagination } from '@/features/jobs/schemas/job.schema';
import type { SessionUser } from '@/store/auth.store';

export const candidateUser: SessionUser = {
  id: 'user-1',
  email: 'ada@example.com',
  role: ROLES.CANDIDATE,
};

export const hrUser: SessionUser = {
  id: 'user-2',
  email: 'grace@acme.test',
  role: ROLES.HR,
};

export const completion = (percentage: number, missingKeys: string[] = []): ProfileCompletion => ({
  percentage,
  completedWeight: percentage,
  totalWeight: 100,
  items: [],
  missing: missingKeys.map((key) => ({ key, label: key, weight: 5, isComplete: false })),
});

export const candidateProfile: CandidateProfile = {
  id: 'profile-1',
  userId: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  preferredLocations: [],
  skills: [],
  jobTypes: [],
  currency: 'INR',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const company: Company = {
  id: 'company-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  locations: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const hrProfile: HrProfile = {
  id: 'profile-2',
  userId: 'user-2',
  firstName: 'Grace',
  lastName: 'Hopper',
  companyRole: 'owner',
  company,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const candidateProfileView: ProfileView = {
  role: ROLES.CANDIDATE,
  profile: candidateProfile,
  completion: completion(10, ['resume', 'experience']),
};

export const hrProfileView: ProfileView = {
  role: ROLES.HR,
  profile: hrProfile,
  completion: completion(20, ['companyDescription']),
};

export const job = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  title: 'Senior Backend Engineer',
  description: 'Own the API from schema to production.',
  role: 'engineering',
  jobType: 'full_time',
  workMode: 'hybrid',
  skills: ['TypeScript', 'MongoDB'],
  locations: ['Pune'],
  ctcMin: 1_800_000,
  ctcMax: 2_800_000,
  experienceMinYears: 4,
  experienceMaxYears: 8,
  status: 'published',
  publishedAt: '2026-03-01T10:00:00.000Z',
  company: { id: 'company-1', name: 'Acme Corp', slug: 'acme-corp' },
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
  ...overrides,
});

/** Wraps jobs in the success envelope the API returns. */
export const jobListResponse = (
  jobs: Job[],
  pagination: Partial<Pagination> = {},
): { success: true; data: { jobs: Job[]; pagination: Pagination } } => ({
  success: true,
  data: {
    jobs,
    pagination: { page: 1, pageSize: 20, total: jobs.length, totalPages: 1, ...pagination },
  },
});

export const jobDetailResponse = (
  overrides: Partial<Job> = {},
): { success: true; data: { job: Job } } => ({
  success: true,
  data: { job: job(overrides) },
});
