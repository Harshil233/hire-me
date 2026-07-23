import type { z } from 'zod';

import type { RegisterCandidateInput, RegisterHrInput } from '../../modules/auth/auth.schema';
import type { UpdateCandidateProfileInput } from '../../modules/candidate/candidate.schema';
import type { certificationInputSchema } from '../../modules/certification/certification.schema';
import type { educationInputSchema } from '../../modules/education/education.schema';
import type { experienceInputSchema } from '../../modules/experience/experience.schema';
import type { createJobSchema } from '../../modules/job/job.schema';
import type { projectInputSchema } from '../../modules/project/project.schema';

/**
 * Shapes for the demo dataset. The data itself is split by subject — employers, jobs,
 * candidates, applications — so no single file has to hold all of it.
 */

export type SeedHr = RegisterHrInput;

export interface SeedJob {
  /** Employer email the listing belongs to. */
  readonly hrEmail: string;
  /** Schema input, so a listing may leave the optional sections out. */
  readonly job: z.input<typeof createJobSchema>;
  /** Left as a draft when false; closed listings are published then closed. */
  readonly publish: boolean;
  readonly close?: boolean;
}

/**
 * The sections a candidate fills in, which an employer sees on their detail page.
 *
 * These are schema *inputs* — dates are `YYYY-MM-DD` strings, exactly what the API
 * receives — so the runner parses them through the same schemas a request goes through
 * and the data cannot drift from what the endpoints would accept.
 */
export interface SeedCandidateSections {
  readonly experience?: readonly ExperienceSeedInput[];
  readonly education?: readonly EducationSeedInput[];
  readonly projects?: readonly ProjectSeedInput[];
  readonly certifications?: readonly CertificationSeedInput[];
}

type ExperienceSeedInput = z.input<typeof experienceInputSchema>;
type EducationSeedInput = z.input<typeof educationInputSchema>;
type ProjectSeedInput = z.input<typeof projectInputSchema>;
type CertificationSeedInput = z.input<typeof certificationInputSchema>;

export interface SeedCandidate {
  readonly account: RegisterCandidateInput;
  readonly profile: UpdateCandidateProfileInput;
  readonly sections?: SeedCandidateSections;
}

/** Which candidate applies to which listing, and where the employer took it next. */
export interface SeedApplication {
  readonly candidateEmail: string;
  readonly jobTitle: string;
  readonly coverNote?: string;
  /** Applied when omitted. `withdrawn` is performed by the candidate. */
  readonly outcome?: 'shortlisted' | 'rejected' | 'withdrawn';
}
