import { ERROR_CODES } from '../../common/errors/error-codes';
import {
  applicantResponseSchema,
  applicationStatusSchema,
  applySchema,
  myApplicationResponseSchema,
} from '../application/application.schema';
import {
  authSessionResponseSchema,
  loginSchema,
  registerCandidateSchema,
  registerHrSchema,
} from '../auth/auth.schema';
import {
  candidateBrowseItemResponseSchema,
  candidateProfileResponseSchema,
  updateCandidateProfileSchema,
} from '../candidate/candidate.schema';
import {
  certificationInputSchema,
  certificationResponseSchema,
} from '../certification/certification.schema';
import {
  companyResponseSchema,
  createCompanySchema,
  updateCompanySchema,
} from '../company/company.schema';
import { educationInputSchema, educationResponseSchema } from '../education/education.schema';
import { experienceInputSchema, experienceResponseSchema } from '../experience/experience.schema';
import { fileResponseSchema } from '../file/file.schema';
import { hrProfileResponseSchema, updateHrProfileSchema } from '../hr/hr.schema';
import {
  createJobSchema,
  jobResponseSchema,
  jobStatusSchema,
  updateJobSchema,
} from '../job/job.schema';
import { markReadSchema, notificationResponseSchema } from '../notification/notification.schema';
import {
  campaignResponseSchema,
  createCampaignSchema,
  unsubscribeSchema,
} from '../outreach/outreach.schema';
import { projectInputSchema, projectResponseSchema } from '../project/project.schema';
import { jsonSchemaOf, ref } from './openapi.builder';
import type { JsonSchema } from './openapi.types';

/**
 * Every named schema in the published contract, derived from the Zod schemas the API
 * validates with. Only the shapes that have no Zod counterpart — the envelopes, which
 * are built by `api-response.ts` rather than parsed — are written out by hand.
 */

/** The failure envelope. Its `code` list is the real `ERROR_CODES` union. */
const errorResponseSchema: JsonSchema = {
  type: 'object',
  required: ['success', 'error'],
  properties: {
    success: { type: 'boolean', const: false },
    error: {
      type: 'object',
      required: ['code', 'message', 'details'],
      properties: {
        code: {
          type: 'string',
          enum: Object.values(ERROR_CODES),
          description: 'Stable, client-facing error code. Never renamed once shipped.',
        },
        message: { type: 'string' },
        details: {
          type: 'array',
          description: 'Per-field detail, populated for 422 validation failures.',
          items: {
            type: 'object',
            required: ['field', 'message'],
            properties: {
              field: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

const paginationMetaSchema: JsonSchema = {
  type: 'object',
  required: ['page', 'pageSize', 'total', 'totalPages'],
  properties: {
    page: { type: 'integer', minimum: 1 },
    pageSize: { type: 'integer', minimum: 1 },
    total: { type: 'integer', minimum: 0 },
    totalPages: { type: 'integer', minimum: 1 },
  },
};

const completionItemSchema: JsonSchema = {
  type: 'object',
  required: ['key', 'label', 'weight', 'isComplete'],
  properties: {
    key: { type: 'string' },
    label: { type: 'string' },
    weight: { type: 'integer' },
    isComplete: { type: 'boolean' },
  },
};

const profileCompletionSchema: JsonSchema = {
  type: 'object',
  required: ['percentage', 'completedWeight', 'totalWeight', 'items', 'missing'],
  properties: {
    percentage: { type: 'integer', minimum: 0, maximum: 100 },
    completedWeight: { type: 'integer' },
    totalWeight: { type: 'integer' },
    items: { type: 'array', items: completionItemSchema },
    missing: {
      type: 'array',
      description: 'The subset of `items` still outstanding — the "what is missing" list.',
      items: completionItemSchema,
    },
  },
};

/**
 * `GET /profile` is role-dispatched: the same route answers with a candidate profile or
 * an HR profile depending on who is asking. `oneOf` is the honest description of that.
 */
const profileViewSchema: JsonSchema = {
  type: 'object',
  required: ['role', 'profile', 'completion'],
  properties: {
    role: { type: 'string', enum: ['candidate', 'hr'] },
    profile: { oneOf: [ref('CandidateProfile'), ref('HrProfile')] },
    completion: ref('ProfileCompletion'),
  },
};

const healthSchema: JsonSchema = {
  type: 'object',
  required: ['status', 'database', 'timestamp'],
  properties: {
    status: { type: 'string', enum: ['ok', 'degraded'] },
    database: { type: 'string', enum: ['up', 'down'] },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

export const COMPONENT_SCHEMAS: Readonly<Record<string, JsonSchema>> = Object.freeze({
  /* Envelopes and shapes with no Zod counterpart. */
  ErrorResponse: errorResponseSchema,
  PaginationMeta: paginationMetaSchema,
  ProfileCompletion: profileCompletionSchema,
  ProfileView: profileViewSchema,
  Health: healthSchema,

  /* Auth. */
  RegisterCandidateInput: jsonSchemaOf(registerCandidateSchema),
  RegisterHrInput: jsonSchemaOf(registerHrSchema),
  LoginInput: jsonSchemaOf(loginSchema),
  AuthSession: jsonSchemaOf(authSessionResponseSchema, 'output'),

  /* Profiles. */
  CandidateProfile: jsonSchemaOf(candidateProfileResponseSchema, 'output'),
  UpdateCandidateProfileInput: jsonSchemaOf(updateCandidateProfileSchema),
  HrProfile: jsonSchemaOf(hrProfileResponseSchema, 'output'),
  UpdateHrProfileInput: jsonSchemaOf(updateHrProfileSchema),

  /* Company. */
  Company: jsonSchemaOf(companyResponseSchema, 'output'),
  CreateCompanyInput: jsonSchemaOf(createCompanySchema),
  UpdateCompanyInput: jsonSchemaOf(updateCompanySchema),

  /* Jobs. */
  Job: jsonSchemaOf(jobResponseSchema, 'output'),
  CreateJobInput: jsonSchemaOf(createJobSchema),
  UpdateJobInput: jsonSchemaOf(updateJobSchema),
  JobStatusInput: jsonSchemaOf(jobStatusSchema),

  /* Applications. */
  ApplyInput: jsonSchemaOf(applySchema),
  ApplicationStatusInput: jsonSchemaOf(applicationStatusSchema),
  MyApplication: jsonSchemaOf(myApplicationResponseSchema, 'output'),
  Applicant: jsonSchemaOf(applicantResponseSchema, 'output'),

  /* Talent pool. */
  CandidateBrowseItem: jsonSchemaOf(candidateBrowseItemResponseSchema, 'output'),

  /* Notifications. */
  Notification: jsonSchemaOf(notificationResponseSchema, 'output'),
  MarkReadInput: jsonSchemaOf(markReadSchema),

  /* Outreach. */
  CreateCampaignInput: jsonSchemaOf(createCampaignSchema),
  Campaign: jsonSchemaOf(campaignResponseSchema, 'output'),
  UnsubscribeInput: jsonSchemaOf(unsubscribeSchema),

  /* Files. */
  File: jsonSchemaOf(fileResponseSchema, 'output'),

  /* Owned profile sections. */
  ExperienceInput: jsonSchemaOf(experienceInputSchema),
  Experience: jsonSchemaOf(experienceResponseSchema, 'output'),
  EducationInput: jsonSchemaOf(educationInputSchema),
  Education: jsonSchemaOf(educationResponseSchema, 'output'),
  CertificationInput: jsonSchemaOf(certificationInputSchema),
  Certification: jsonSchemaOf(certificationResponseSchema, 'output'),
  ProjectInput: jsonSchemaOf(projectInputSchema),
  Project: jsonSchemaOf(projectResponseSchema, 'output'),
});
