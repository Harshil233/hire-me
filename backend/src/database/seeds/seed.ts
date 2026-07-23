import { APPLICATION_STATUSES, JOB_STATUSES, ROLES } from '../../config/constants';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { createContainer } from '../../container';
import { APPLICATION_SERVICE } from '../../modules/application/application.interface';
import { AUTH_SERVICE } from '../../modules/auth/auth.interface';
import { CANDIDATE_PROFILE_SERVICE } from '../../modules/candidate/candidate.interface';
import { updateCandidateProfileSchema } from '../../modules/candidate/candidate.schema';
import { COMPANY_MEMBERSHIP, COMPANY_SERVICE } from '../../modules/company/company.interface';
import { JOB_SERVICE } from '../../modules/job/job.interface';
import { createJobSchema } from '../../modules/job/job.schema';
import { USER_REPOSITORY } from '../../modules/user/user.interface';
import { MongooseConnection, getConnection } from '../connection';
import { CERTIFICATION_SERVICE } from '../../modules/certification/certification.interface';
import { certificationInputSchema } from '../../modules/certification/certification.schema';
import { EDUCATION_SERVICE } from '../../modules/education/education.interface';
import { educationInputSchema } from '../../modules/education/education.schema';
import { EXPERIENCE_SERVICE } from '../../modules/experience/experience.interface';
import { experienceInputSchema } from '../../modules/experience/experience.schema';
import { PROJECT_SERVICE } from '../../modules/project/project.interface';
import { projectInputSchema } from '../../modules/project/project.schema';
import {
  SEED_APPLICATIONS,
  SEED_CANDIDATES,
  SEED_HRS,
  SEED_JOBS,
  SEED_PASSWORD,
  type SeedCandidateSections,
} from './seed.data';

/**
 * Fills a development database with something to look at: employers with companies,
 * published listings, candidates, and applications an employer has already acted on.
 *
 * It drives the real services rather than writing to the collections directly, so
 * passwords are hashed, slugs are derived, status transitions are validated and the
 * notifications that follow a status change are emitted exactly as they are in the app
 * (CLAUDE.md §9 — the rules are not restated here).
 *
 * Additive and re-runnable: an account that already exists is reused, and nothing is
 * ever deleted. Run it with `npm run seed`.
 */
const seed = async (): Promise<void> => {
  // Every seeded account shares one published password, so this must never reach a
  // production database — it would create real, publicly-known credentials.
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is production');
  }

  const database = new MongooseConnection(
    { uri: env.MONGO_URI, dbName: env.MONGO_DB_NAME },
    logger,
  );

  await database.connect();

  const container = createContainer({
    env,
    logger,
    database,
    connection: getConnection(),
  });

  const users = container.resolve(USER_REPOSITORY);
  const authService = container.resolve(AUTH_SERVICE);
  const jobService = container.resolve(JOB_SERVICE);
  const applicationService = container.resolve(APPLICATION_SERVICE);
  const candidateProfiles = container.resolve(CANDIDATE_PROFILE_SERVICE);
  const companies = container.resolve(COMPANY_SERVICE);
  const membership = container.resolve(COMPANY_MEMBERSHIP);

  const userIdByEmail = new Map<string, string>();
  const jobIdByTitle = new Map<string, string>();
  const hrEmailByJobTitle = new Map<string, string>();

  const experiences = container.resolve(EXPERIENCE_SERVICE);
  const educations = container.resolve(EDUCATION_SERVICE);
  const projects = container.resolve(PROJECT_SERVICE);
  const certifications = container.resolve(CERTIFICATION_SERVICE);

  let created = { employers: 0, candidates: 0, sections: 0, jobs: 0, jobSections: 0, companyLinks: 0, applications: 0 };

  /**
   * Writes one section list, but only when the candidate has none of that kind yet.
   *
   * Per-section rather than per-account, because an environment seeded before sections
   * existed already has the accounts: skipping on "the user exists" would leave those
   * profiles permanently empty. Entries are parsed through the same schemas a request
   * goes through, so seed data cannot drift from what the endpoints would accept.
   */
  const fillSection = async <TEntry, TParsed>(
    service: { countByUser(userId: string): Promise<number>; create(userId: string, data: TParsed): Promise<unknown> },
    userId: string,
    entries: readonly TEntry[] | undefined,
    parse: (entry: TEntry) => TParsed,
  ): Promise<number> => {
    if (entries === undefined || entries.length === 0) {
      return 0;
    }

    if ((await service.countByUser(userId)) > 0) {
      return 0;
    }

    await Promise.all(entries.map((entry) => service.create(userId, parse(entry))));
    return entries.length;
  };

  /** Backfills every section an employer sees on a candidate's detail page. */
  const addSections = async (
    userId: string,
    sections: SeedCandidateSections | undefined,
  ): Promise<number> => {
    if (sections === undefined) {
      return 0;
    }

    const written = await Promise.all([
      fillSection(experiences, userId, sections.experience, (entry) =>
        experienceInputSchema.parse(entry),
      ),
      fillSection(educations, userId, sections.education, (entry) =>
        educationInputSchema.parse(entry),
      ),
      fillSection(projects, userId, sections.projects, (entry) =>
        projectInputSchema.parse(entry),
      ),
      fillSection(certifications, userId, sections.certifications, (entry) =>
        certificationInputSchema.parse(entry),
      ),
    ]);

    return written.reduce((total, count) => total + count, 0);
  };

  /** Adds the company's public links where the record does not carry them yet. */
  const addCompanyLinks = async (userId: string, hr: (typeof SEED_HRS)[number]): Promise<void> => {
    const companyId = await membership.findCompanyIdForUser(userId);

    if (companyId === null) {
      return;
    }

    const company = await companies.getById(companyId);
    const links = {
      ...(company.linkedinUrl === undefined && hr.company.linkedinUrl !== undefined
        ? { linkedinUrl: hr.company.linkedinUrl }
        : {}),
      ...(company.facebookUrl === undefined && hr.company.facebookUrl !== undefined
        ? { facebookUrl: hr.company.facebookUrl }
        : {}),
      ...(company.instagramUrl === undefined && hr.company.instagramUrl !== undefined
        ? { instagramUrl: hr.company.instagramUrl }
        : {}),
    };

    if (Object.keys(links).length > 0) {
      await companies.update(companyId, userId, links);
      created = { ...created, companyLinks: created.companyLinks + 1 };
    }
  };

  /* ------------------------------------------------------------- employers */
  for (const hr of SEED_HRS) {
    const existing = await users.findByEmail(hr.email);

    if (existing !== null) {
      userIdByEmail.set(hr.email, existing.id);
      // Backfill: a company registered before the social links existed still gets them.
      await addCompanyLinks(existing.id, hr);
      continue;
    }

    const session = await authService.registerHr(hr, {});
    userIdByEmail.set(hr.email, session.user.id);
    created = { ...created, employers: created.employers + 1 };
  }

  /* ------------------------------------------------------------ candidates */
  for (const candidate of SEED_CANDIDATES) {
    const existing = await users.findByEmail(candidate.account.email);
    let userId: string;

    if (existing === null) {
      const session = await authService.registerCandidate(candidate.account, {});
      userId = session.user.id;
      // Fills in skills and location, so an employer's applicant list is not blank.
      await candidateProfiles.update(userId, updateCandidateProfileSchema.parse(candidate.profile));
      created = { ...created, candidates: created.candidates + 1 };
    } else {
      userId = existing.id;
    }

    userIdByEmail.set(candidate.account.email, userId);
    // Runs for existing accounts too, so a database seeded before sections existed
    // still ends up with them.
    created = {
      ...created,
      sections: created.sections + (await addSections(userId, candidate.sections)),
    };
  }

  /* ------------------------------------------------------------------ jobs */
  for (const entry of SEED_JOBS) {
    const hrUserId = userIdByEmail.get(entry.hrEmail);

    if (hrUserId === undefined) {
      logger.warn('Skipping a listing whose employer is missing', { title: entry.job.title });
      continue;
    }

    hrEmailByJobTitle.set(entry.job.title, entry.hrEmail);

    // Re-running must not duplicate listings, so an existing title for this company wins.
    const owned = await jobService.listForHr(hrUserId, { page: 1, pageSize: 100 });
    const already = owned.jobs.find((job) => job.title === entry.job.title);

    if (already !== undefined) {
      jobIdByTitle.set(entry.job.title, already.id);

      // Backfill: a listing seeded before the description sections existed still gets
      // them, and one that already has them is left alone.
      const parsed = createJobSchema.parse(entry.job);
      const needsSections =
        already.highlights.length === 0 &&
        already.responsibilities.length === 0 &&
        already.qualifications.length === 0 &&
        parsed.highlights.length + parsed.responsibilities.length + parsed.qualifications.length >
          0;

      if (needsSections) {
        await jobService.update(already.id, hrUserId, {
          highlights: parsed.highlights,
          responsibilities: parsed.responsibilities,
          qualifications: parsed.qualifications,
        });
        created = { ...created, jobSections: created.jobSections + 1 };
      }

      continue;
    }

    const job = await jobService.create(hrUserId, createJobSchema.parse(entry.job));
    jobIdByTitle.set(entry.job.title, job.id);
    created = { ...created, jobs: created.jobs + 1 };

    if (entry.publish) {
      await jobService.changeStatus(job.id, hrUserId, JOB_STATUSES.PUBLISHED);
    }
    if (entry.close === true) {
      await jobService.changeStatus(job.id, hrUserId, JOB_STATUSES.CLOSED);
    }
  }

  /* ---------------------------------------------------------- applications */
  for (const entry of SEED_APPLICATIONS) {
    const candidateUserId = userIdByEmail.get(entry.candidateEmail);
    const jobId = jobIdByTitle.get(entry.jobTitle);
    const hrEmail = hrEmailByJobTitle.get(entry.jobTitle);
    const hrUserId = hrEmail === undefined ? undefined : userIdByEmail.get(hrEmail);

    if (candidateUserId === undefined || jobId === undefined || hrUserId === undefined) {
      logger.warn('Skipping an application with a missing reference', {
        candidate: entry.candidateEmail,
        job: entry.jobTitle,
      });
      continue;
    }

    let applicationId: string;

    try {
      const application = await applicationService.apply(jobId, candidateUserId, {
        ...(entry.coverNote !== undefined ? { coverNote: entry.coverNote } : {}),
      });
      applicationId = application.id;
      created = { ...created, applications: created.applications + 1 };
    } catch {
      // Already applied on an earlier run — the unique index refused the duplicate.
      continue;
    }

    if (entry.outcome === undefined) {
      continue;
    }

    if (entry.outcome === 'withdrawn') {
      await applicationService.changeStatus(
        applicationId,
        candidateUserId,
        ROLES.CANDIDATE,
        APPLICATION_STATUSES.WITHDRAWN,
      );
      continue;
    }

    // Performed by the employer, so this also emits the candidate's notification.
    await applicationService.changeStatus(
      applicationId,
      hrUserId,
      ROLES.HR,
      entry.outcome === 'shortlisted'
        ? APPLICATION_STATUSES.SHORTLISTED
        : APPLICATION_STATUSES.REJECTED,
    );
  }

  logger.info('Seed complete', created);
  logger.info('Every seeded account shares one password', { password: SEED_PASSWORD });
  logger.info('Sign in as an employer at /hr/login', { email: SEED_HRS[0]?.email });

  await database.disconnect();
};

seed().catch((error: unknown) => {
  logger.error('Seeding failed', {
    reason: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
