import type { Connection } from 'mongoose';

import type { Env } from '../config/env';
import type { ILogger } from '../common/types/logger';
import { createAuthenticateMiddleware } from '../common/middlewares/authenticate.middleware';
import { createRateLimiter } from '../common/middlewares/rate-limit.middleware';
import { createUploadMiddleware } from '../common/middlewares/upload.middleware';
import { OwnedResourceController } from '../common/http/owned-resource.controller';
import { OwnedResourceService } from '../common/persistence/owned-resource.service';
import { BcryptPasswordHasher } from '../common/security/password-hasher';
import { JwtTokenService } from '../common/security/jwt-token.service';
import { MongooseConnection, type IDatabaseConnection } from '../database/connection';
import { MongooseTransactionManager } from '../database/mongoose-transaction-manager';
import {
  ApplicationModel,
  CandidateProfileModel,
  CertificationModel,
  CompanyModel,
  EducationModel,
  ExperienceModel,
  FileModel,
  HrProfileModel,
  JobModel,
  NotificationModel,
  ProjectModel,
  RefreshTokenModel,
  UserModel,
} from '../database/models';

import { AuthController } from '../modules/auth/auth.controller';
import { AuthService } from '../modules/auth/auth.service';
import { RefreshTokenRepository } from '../modules/auth/auth.repository';
import { AUTH_SERVICE, REFRESH_TOKEN_REPOSITORY } from '../modules/auth/auth.interface';
import { CandidateCompletionCalculator } from '../modules/candidate/candidate.completion';
import { CandidateProfileRepository } from '../modules/candidate/candidate.repository';
import { CandidateProfileService } from '../modules/candidate/candidate.service';
import { CandidateDirectoryService } from '../modules/candidate/candidate.directory.service';
import { CandidateProfileStrategy } from '../modules/candidate/candidate.strategy';
import { CandidateController } from '../modules/candidate/candidate.controller';
import {
  CANDIDATE_DIRECTORY_SERVICE,
  CANDIDATE_PROFILE_REPOSITORY,
  CANDIDATE_PROFILE_SERVICE,
} from '../modules/candidate/candidate.interface';
import { CertificationRepository } from '../modules/certification/certification.repository';
import { toCertificationResponse } from '../modules/certification/certification.mapper';
import {
  CERTIFICATION_REPOSITORY,
  CERTIFICATION_SERVICE,
} from '../modules/certification/certification.interface';
import { CompanyController } from '../modules/company/company.controller';
import { CompanyDirectoryAdapter } from '../modules/company/company-directory.adapter';
import { CompanyRepository } from '../modules/company/company.repository';
import { ApplicationController } from '../modules/application/application.controller';
import { ApplicationRepository } from '../modules/application/application.repository';
import { ApplicationService } from '../modules/application/application.service';
import {
  APPLICATION_REPOSITORY,
  APPLICATION_SERVICE,
  CANDIDATE_DIRECTORY,
} from '../modules/application/application.interface';
import { CandidateDirectoryAdapter } from '../modules/candidate/candidate-directory.adapter';
import { NotificationController } from '../modules/notification/notification.controller';
import { NotificationRepository } from '../modules/notification/notification.repository';
import { NotificationService } from '../modules/notification/notification.service';
import {
  NOTIFICATION_REPOSITORY,
  NOTIFICATION_SERVICE,
} from '../modules/notification/notification.interface';
import { JobController } from '../modules/job/job.controller';
import { JobRepository } from '../modules/job/job.repository';
import { JobService } from '../modules/job/job.service';
import {
  COMPANY_DIRECTORY,
  JOB_REPOSITORY,
  JOB_SERVICE,
  JOB_SUMMARY_PROVIDER,
} from '../modules/job/job.interface';
import { CompanyService } from '../modules/company/company.service';
import {
  COMPANY_MEMBERSHIP,
  COMPANY_REPOSITORY,
  COMPANY_SERVICE,
} from '../modules/company/company.interface';
import { EducationRepository } from '../modules/education/education.repository';
import { toEducationResponse } from '../modules/education/education.mapper';
import { EDUCATION_REPOSITORY, EDUCATION_SERVICE } from '../modules/education/education.interface';
import { ExperienceRepository } from '../modules/experience/experience.repository';
import { toExperienceResponse } from '../modules/experience/experience.mapper';
import {
  EXPERIENCE_REPOSITORY,
  EXPERIENCE_SERVICE,
} from '../modules/experience/experience.interface';
import { FileController } from '../modules/file/file.controller';
import { FileRepository } from '../modules/file/file.repository';
import { FileService } from '../modules/file/file.service';
import {
  EmployerCandidateFileAccessPolicy,
  OwnerFileAccessPolicy,
} from '../modules/file/file.access-policy';
import { LocalDiskFileStorage } from '../modules/file/file.storage';
import { FILE_REPOSITORY, FILE_SERVICE, FILE_STORAGE } from '../modules/file/file.interface';
import { HealthController } from '../modules/health/health.controller';
import { HrCompanyMembershipAdapter } from '../modules/hr/hr-company-membership.adapter';
import { HrCompletionCalculator } from '../modules/hr/hr.completion';
import { HrProfileRepository } from '../modules/hr/hr.repository';
import { HrProfileService } from '../modules/hr/hr.service';
import { HrProfileStrategy } from '../modules/hr/hr.strategy';
import { HR_PROFILE_REPOSITORY, HR_PROFILE_SERVICE } from '../modules/hr/hr.interface';
import { ProfileController } from '../modules/profile/profile.controller';
import { ProfileService } from '../modules/profile/profile.service';
import { createProfileUpdateValidator } from '../modules/profile/profile.validator';
import { PROFILE_SERVICE } from '../modules/profile/profile.interface';
import { ProjectRepository } from '../modules/project/project.repository';
import { toProjectResponse } from '../modules/project/project.mapper';
import { PROJECT_REPOSITORY, PROJECT_SERVICE } from '../modules/project/project.interface';
import { UserRepository } from '../modules/user/user.repository';
import { UserService } from '../modules/user/user.service';
import { USER_REPOSITORY, USER_SERVICE } from '../modules/user/user.interface';

import { Container } from './container';
import {
  AUTHENTICATE_MIDDLEWARE,
  AUTH_CONTROLLER,
  AUTH_RATE_LIMITER,
  CERTIFICATION_CONTROLLER,
  COMPANY_CONTROLLER,
  EDUCATION_CONTROLLER,
  EXPERIENCE_CONTROLLER,
  FILE_CONTROLLER,
  APPLICATION_CONTROLLER,
  CANDIDATE_CONTROLLER,
  HEALTH_CONTROLLER,
  JOB_CONTROLLER,
  NOTIFICATION_CONTROLLER,
  PROFILE_CONTROLLER,
  PROFILE_UPDATE_VALIDATOR,
  PROJECT_CONTROLLER,
  TRANSACTION_MANAGER,
  UPLOAD_MIDDLEWARE,
} from './tokens';

export interface ContainerConfig {
  readonly env: Env;
  readonly connection: Connection;
  readonly logger: ILogger;
  readonly database: IDatabaseConnection;
  /** Injected clock keeps time-dependent behaviour testable. */
  readonly now?: () => Date;
}

/**
 * Composition root — the only place concrete classes are known (CLAUDE.md §7).
 * Everything else receives interfaces through its constructor.
 */
export const createContainer = (config: ContainerConfig): Container => {
  const { env, connection, logger, database } = config;
  const now = config.now ?? ((): Date => new Date());
  const container = new Container();

  /* ---------------------------------------------------------------- infra */
  const transactionManager = new MongooseTransactionManager(connection);
  const passwordHasher = new BcryptPasswordHasher(env.BCRYPT_ROUNDS);
  const tokenService = new JwtTokenService({
    accessSecret: env.JWT_ACCESS_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshTtl: env.JWT_REFRESH_TTL,
  });
  const fileStorage = new LocalDiskFileStorage(env.FILE_STORAGE_PATH);

  container.register(TRANSACTION_MANAGER, transactionManager);
  container.register(FILE_STORAGE, fileStorage);
  container.register(AUTHENTICATE_MIDDLEWARE, createAuthenticateMiddleware(tokenService));
  container.register(UPLOAD_MIDDLEWARE, createUploadMiddleware(env.MAX_UPLOAD_BYTES));
  container.register(
    AUTH_RATE_LIMITER,
    createRateLimiter({ windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX }),
  );

  /* --------------------------------------------------------- repositories */
  const userRepository = new UserRepository(UserModel);
  const refreshTokenRepository = new RefreshTokenRepository(RefreshTokenModel);
  const candidateProfileRepository = new CandidateProfileRepository(CandidateProfileModel);
  const hrProfileRepository = new HrProfileRepository(HrProfileModel);
  const companyRepository = new CompanyRepository(CompanyModel);
  const experienceRepository = new ExperienceRepository(ExperienceModel);
  const educationRepository = new EducationRepository(EducationModel);
  const certificationRepository = new CertificationRepository(CertificationModel);
  const projectRepository = new ProjectRepository(ProjectModel);
  const fileRepository = new FileRepository(FileModel);
  const jobRepository = new JobRepository(JobModel);
  const applicationRepository = new ApplicationRepository(ApplicationModel);
  const notificationRepository = new NotificationRepository(NotificationModel);

  container
    .register(USER_REPOSITORY, userRepository)
    .register(REFRESH_TOKEN_REPOSITORY, refreshTokenRepository)
    .register(CANDIDATE_PROFILE_REPOSITORY, candidateProfileRepository)
    .register(HR_PROFILE_REPOSITORY, hrProfileRepository)
    .register(COMPANY_REPOSITORY, companyRepository)
    .register(EXPERIENCE_REPOSITORY, experienceRepository)
    .register(EDUCATION_REPOSITORY, educationRepository)
    .register(CERTIFICATION_REPOSITORY, certificationRepository)
    .register(PROJECT_REPOSITORY, projectRepository)
    .register(FILE_REPOSITORY, fileRepository)
    .register(JOB_REPOSITORY, jobRepository)
    .register(APPLICATION_REPOSITORY, applicationRepository)
    .register(NOTIFICATION_REPOSITORY, notificationRepository);

  /* ------------------------------------------------------------- services */
  const userService = new UserService(userRepository);
  const candidateProfileService = new CandidateProfileService(candidateProfileRepository);
  const hrProfileService = new HrProfileService(hrProfileRepository);
  const companyMembership = new HrCompanyMembershipAdapter(hrProfileRepository);
  const companyService = new CompanyService(
    companyRepository,
    companyMembership,
    transactionManager,
  );

  const experienceService = new OwnedResourceService(experienceRepository, 'Experience');
  const educationService = new OwnedResourceService(educationRepository, 'Education');
  const certificationService = new OwnedResourceService(certificationRepository, 'Certification');
  const projectService = new OwnedResourceService(projectRepository, 'Project');

  const candidateDirectoryService = new CandidateDirectoryService(candidateProfileRepository, {
    experience: experienceService,
    education: educationService,
    project: projectService,
    certification: certificationService,
  });
  // Owner first: the common case is someone reading their own upload back.
  const fileService = new FileService(fileRepository, fileStorage, [
    new OwnerFileAccessPolicy(),
    new EmployerCandidateFileAccessPolicy(),
  ]);

  const companyDirectory = new CompanyDirectoryAdapter(companyRepository);
  const jobService = new JobService(jobRepository, companyMembership, companyDirectory, now);

  const candidateDirectory = new CandidateDirectoryAdapter(candidateProfileRepository);
  const notificationService = new NotificationService(notificationRepository, now);
  const applicationService = new ApplicationService({
    applicationRepository,
    jobService,
    jobSummaries: jobRepository,
    membership: companyMembership,
    candidateProfileService,
    candidateDirectory,
    notificationService,
    transactionManager,
    now,
  });

  const authService = new AuthService({
    userRepository,
    userService,
    refreshTokenRepository,
    candidateProfileService,
    hrProfileService,
    companyService,
    passwordHasher,
    tokenService,
    transactionManager,
    now,
  });

  const profileService = new ProfileService([
    new CandidateProfileStrategy(
      candidateProfileService,
      {
        experience: experienceService,
        education: educationService,
        project: projectService,
        certification: certificationService,
      },
      new CandidateCompletionCalculator(),
    ),
    new HrProfileStrategy(hrProfileService, companyService, new HrCompletionCalculator()),
  ]);

  container
    .register(USER_SERVICE, userService)
    .register(CANDIDATE_PROFILE_SERVICE, candidateProfileService)
    .register(CANDIDATE_DIRECTORY_SERVICE, candidateDirectoryService)
    .register(HR_PROFILE_SERVICE, hrProfileService)
    .register(COMPANY_MEMBERSHIP, companyMembership)
    .register(COMPANY_SERVICE, companyService)
    .register(COMPANY_DIRECTORY, companyDirectory)
    .register(JOB_SERVICE, jobService)
    .register(JOB_SUMMARY_PROVIDER, jobRepository)
    .register(CANDIDATE_DIRECTORY, candidateDirectory)
    .register(APPLICATION_SERVICE, applicationService)
    .register(NOTIFICATION_SERVICE, notificationService)
    .register(EXPERIENCE_SERVICE, experienceService)
    .register(EDUCATION_SERVICE, educationService)
    .register(CERTIFICATION_SERVICE, certificationService)
    .register(PROJECT_SERVICE, projectService)
    .register(FILE_SERVICE, fileService)
    .register(AUTH_SERVICE, authService)
    .register(PROFILE_SERVICE, profileService);

  /* ---------------------------------------------------------- controllers */
  container
    .register(
      AUTH_CONTROLLER,
      new AuthController(authService, userService, {
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE,
      }),
    )
    .register(PROFILE_CONTROLLER, new ProfileController(profileService))
    .register(PROFILE_UPDATE_VALIDATOR, createProfileUpdateValidator(profileService))
    .register(CANDIDATE_CONTROLLER, new CandidateController(candidateDirectoryService))
    .register(COMPANY_CONTROLLER, new CompanyController(companyService))
    .register(JOB_CONTROLLER, new JobController(jobService))
    .register(APPLICATION_CONTROLLER, new ApplicationController(applicationService))
    .register(NOTIFICATION_CONTROLLER, new NotificationController(notificationService))
    .register(FILE_CONTROLLER, new FileController(fileService))
    .register(HEALTH_CONTROLLER, new HealthController(database, now))
    .register(
      EXPERIENCE_CONTROLLER,
      new OwnedResourceController(experienceService, toExperienceResponse, {
        plural: 'experiences',
        singular: 'experience',
      }),
    )
    .register(
      EDUCATION_CONTROLLER,
      new OwnedResourceController(educationService, toEducationResponse, {
        plural: 'educations',
        singular: 'education',
      }),
    )
    .register(
      CERTIFICATION_CONTROLLER,
      new OwnedResourceController(certificationService, toCertificationResponse, {
        plural: 'certifications',
        singular: 'certification',
      }),
    )
    .register(
      PROJECT_CONTROLLER,
      new OwnedResourceController(projectService, toProjectResponse, {
        plural: 'projects',
        singular: 'project',
      }),
    );

  logger.debug('Dependency container initialised');

  return container;
};

export { Container } from './container';
export { MongooseConnection };
