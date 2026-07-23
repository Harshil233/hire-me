import { describe, expect, it } from 'vitest';

import { registerCandidateSchema, registerHrSchema } from '../../../modules/auth/auth.schema';
import { certificationInputSchema } from '../../../modules/certification/certification.schema';
import { educationInputSchema } from '../../../modules/education/education.schema';
import { experienceInputSchema } from '../../../modules/experience/experience.schema';
import { createJobSchema } from '../../../modules/job/job.schema';
import { updateCandidateProfileSchema } from '../../../modules/candidate/candidate.schema';
import { projectInputSchema } from '../../../modules/project/project.schema';
import { SEED_APPLICATIONS, SEED_CANDIDATES, SEED_HRS, SEED_JOBS } from '../seed.data';

/**
 * The seed drives the real services, so invalid data fails at `npm run seed` — after a
 * database has already been half-written. A dangling reference is worse: the runner logs
 * a warning and carries on, so the environment comes up quietly incomplete. Both are
 * cheaper to catch here.
 */

const employerEmails = new Set(SEED_HRS.map((hr) => hr.email));
const candidateEmails = new Set(SEED_CANDIDATES.map((candidate) => candidate.account.email));
const jobTitles = new Set(SEED_JOBS.map((entry) => entry.job.title));

describe('seed employers', () => {
  it('is a useful number of companies', () => {
    expect(SEED_HRS.length).toBeGreaterThanOrEqual(5);
  });

  it('every account passes the real registration schema', () => {
    for (const hr of SEED_HRS) {
      expect(registerHrSchema.safeParse(hr).success).toBe(true);
    }
  });

  it('has no duplicate employer email', () => {
    expect(employerEmails.size).toBe(SEED_HRS.length);
  });

  it('has no duplicate company name', () => {
    const names = new Set(SEED_HRS.map((hr) => hr.company.name));
    expect(names.size).toBe(SEED_HRS.length);
  });
});

describe('seed jobs', () => {
  it('fills the board rather than leaving it sparse', () => {
    expect(SEED_JOBS.length).toBeGreaterThanOrEqual(30);
  });

  it('every listing passes the real create schema', () => {
    for (const entry of SEED_JOBS) {
      expect(createJobSchema.safeParse(entry.job).success).toBe(true);
    }
  });

  it('every listing belongs to a seeded employer', () => {
    for (const entry of SEED_JOBS) {
      expect(employerEmails.has(entry.hrEmail)).toBe(true);
    }
  });

  it('has no duplicate title, which the runner would treat as already seeded', () => {
    expect(jobTitles.size).toBe(SEED_JOBS.length);
  });

  it('covers every job type and work mode so the filters have something to find', () => {
    const published = SEED_JOBS.filter((entry) => entry.publish && entry.close !== true);

    expect(new Set(published.map((entry) => entry.job.jobType)).size).toBe(5);
    expect(new Set(published.map((entry) => entry.job.workMode)).size).toBe(3);
  });

  it('includes drafts and a closed listing, not only live ones', () => {
    expect(SEED_JOBS.some((entry) => !entry.publish)).toBe(true);
    expect(SEED_JOBS.some((entry) => entry.close === true)).toBe(true);
  });

  it('never records a pay floor above its ceiling', () => {
    for (const { job } of SEED_JOBS) {
      if (job.ctcMin !== undefined && job.ctcMax !== undefined) {
        expect(job.ctcMin).toBeLessThanOrEqual(job.ctcMax as number);
      }
    }
  });
});

describe('seed candidates', () => {
  it('is a browsable pool rather than a handful', () => {
    expect(SEED_CANDIDATES.length).toBeGreaterThanOrEqual(20);
  });

  it('every account passes the real registration schema', () => {
    for (const candidate of SEED_CANDIDATES) {
      expect(registerCandidateSchema.safeParse(candidate.account).success).toBe(true);
    }
  });

  it('every profile passes the real update schema', () => {
    for (const candidate of SEED_CANDIDATES) {
      expect(updateCandidateProfileSchema.safeParse(candidate.profile).success).toBe(true);
    }
  });

  it('has no duplicate candidate email', () => {
    expect(candidateEmails.size).toBe(SEED_CANDIDATES.length);
  });

  it('every section entry passes the schema the API would apply', () => {
    for (const { sections } of SEED_CANDIDATES) {
      for (const entry of sections?.experience ?? []) {
        expect(experienceInputSchema.safeParse(entry).success).toBe(true);
      }
      for (const entry of sections?.education ?? []) {
        expect(educationInputSchema.safeParse(entry).success).toBe(true);
      }
      for (const entry of sections?.projects ?? []) {
        expect(projectInputSchema.safeParse(entry).success).toBe(true);
      }
      for (const entry of sections?.certifications ?? []) {
        expect(certificationInputSchema.safeParse(entry).success).toBe(true);
      }
    }
  });

  it('gives almost everyone something to show on their detail page', () => {
    const withSections = SEED_CANDIDATES.filter(
      (candidate) =>
        (candidate.sections?.experience?.length ?? 0) +
          (candidate.sections?.education?.length ?? 0) >
        0,
    );

    expect(withSections.length).toBe(SEED_CANDIDATES.length);
  });

  it('spreads across cities so the location filter is worth using', () => {
    const locations = new Set(
      SEED_CANDIDATES.map((candidate) => candidate.profile.currentLocation),
    );

    expect(locations.size).toBeGreaterThanOrEqual(6);
  });
});

describe('seed applications', () => {
  it('every application refers to a seeded candidate', () => {
    for (const entry of SEED_APPLICATIONS) {
      expect(candidateEmails.has(entry.candidateEmail)).toBe(true);
    }
  });

  it('every application refers to a seeded listing', () => {
    for (const entry of SEED_APPLICATIONS) {
      expect(jobTitles.has(entry.jobTitle)).toBe(true);
    }
  });

  it('never applies to a draft, which the API would refuse', () => {
    const draftTitles = new Set(
      SEED_JOBS.filter((entry) => !entry.publish).map((entry) => entry.job.title),
    );

    for (const entry of SEED_APPLICATIONS) {
      expect(draftTitles.has(entry.jobTitle)).toBe(false);
    }
  });

  it('never applies twice to the same listing, which the unique index would refuse', () => {
    const pairs = SEED_APPLICATIONS.map((entry) => `${entry.candidateEmail}::${entry.jobTitle}`);

    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('produces every outcome an employer can reach', () => {
    const outcomes = new Set(SEED_APPLICATIONS.map((entry) => entry.outcome));

    expect(outcomes).toEqual(new Set([undefined, 'shortlisted', 'rejected', 'withdrawn']));
  });
});
