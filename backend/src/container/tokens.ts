import type { RequestHandler } from 'express';

import type { ITransactionManager } from '../common/persistence/transaction.types';
import type { AuthController } from '../modules/auth/auth.controller';
import type { CompanyController } from '../modules/company/company.controller';
import type { FileController } from '../modules/file/file.controller';
import type { HealthController } from '../modules/health/health.controller';
import type { JobController } from '../modules/job/job.controller';
import type { ProfileController } from '../modules/profile/profile.controller';
import type { OwnedResourceController } from '../common/http/owned-resource.controller';
import type { Certification } from '../modules/certification/certification.interface';
import type { CertificationInput, CertificationResponse } from '../modules/certification/certification.schema';
import type { Education } from '../modules/education/education.interface';
import type { EducationInput, EducationResponse } from '../modules/education/education.schema';
import type { Experience } from '../modules/experience/experience.interface';
import type { ExperienceInput, ExperienceResponse } from '../modules/experience/experience.schema';
import type { Project } from '../modules/project/project.interface';
import type { ProjectInput, ProjectResponse } from '../modules/project/project.schema';
import { createToken, type Token } from './token';

/** HTTP-layer and infrastructure tokens. Domain tokens live in each module's interface. */

export const TRANSACTION_MANAGER: Token<ITransactionManager> = createToken('ITransactionManager');
export const AUTHENTICATE_MIDDLEWARE: Token<RequestHandler> = createToken('AuthenticateMiddleware');
export const UPLOAD_MIDDLEWARE: Token<RequestHandler> = createToken('UploadMiddleware');
export const AUTH_RATE_LIMITER: Token<RequestHandler> = createToken('AuthRateLimiter');

export const AUTH_CONTROLLER: Token<AuthController> = createToken('AuthController');
export const PROFILE_CONTROLLER: Token<ProfileController> = createToken('ProfileController');
export const COMPANY_CONTROLLER: Token<CompanyController> = createToken('CompanyController');
export const FILE_CONTROLLER: Token<FileController> = createToken('FileController');
export const JOB_CONTROLLER: Token<JobController> = createToken('JobController');
export const HEALTH_CONTROLLER: Token<HealthController> = createToken('HealthController');
export const PROFILE_UPDATE_VALIDATOR: Token<RequestHandler> = createToken(
  'ProfileUpdateValidator',
);

export const EXPERIENCE_CONTROLLER: Token<
  OwnedResourceController<Experience, ExperienceInput, ExperienceResponse>
> = createToken('ExperienceController');
export const EDUCATION_CONTROLLER: Token<
  OwnedResourceController<Education, EducationInput, EducationResponse>
> = createToken('EducationController');
export const CERTIFICATION_CONTROLLER: Token<
  OwnedResourceController<Certification, CertificationInput, CertificationResponse>
> = createToken('CertificationController');
export const PROJECT_CONTROLLER: Token<
  OwnedResourceController<Project, ProjectInput, ProjectResponse>
> = createToken('ProjectController');
