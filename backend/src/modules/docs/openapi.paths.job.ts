import {
  jobApplicantQuerySchema,
  myApplicationQuerySchema,
} from '../application/application.schema';
import { hrJobQuerySchema, jobQuerySchema } from '../job/job.schema';
import {
  jsonBody,
  jsonResponse,
  paginatedEnvelope,
  pathParameter,
  queryParameters,
  ref,
  wrappedEnvelope,
} from './openapi.builder';
import { AUTHENTICATED_ERRORS, RESPONSES, VALIDATED_ERRORS } from './openapi.responses';
import type { PathItemObject } from './openapi.types';

/** Listings and the applications made against them. */

const TAG_JOBS = 'Jobs';
const TAG_APPLICATIONS = 'Applications';

const jobIdParameter = pathParameter('id', 'Id of the job listing.');

export const JOB_PATHS: Readonly<Record<string, PathItemObject>> = {
  '/jobs': {
    get: {
      tags: [TAG_JOBS],
      summary: 'Browse published listings',
      description:
        'Only `published` listings are visible here, whoever asks. `search` is matched word by word across the title, description, skills, locations, role **and** the employer’s name.',
      operationId: 'browseJobs',
      parameters: queryParameters(jobQuerySchema),
      responses: {
        '200': jsonResponse('A page of listings.', paginatedEnvelope('jobs', ref('Job'))),
        ...VALIDATED_ERRORS,
      },
    },
    post: {
      tags: [TAG_JOBS],
      summary: 'Post a listing (employer)',
      description:
        'Created as a **draft**. The owning company is taken from the poster’s own membership — a `companyId` in the body is ignored, so one employer cannot post under another’s name.',
      operationId: 'createJob',
      requestBody: jsonBody(ref('CreateJobInput')),
      responses: {
        '201': jsonResponse('Created as a draft.', wrappedEnvelope('job', ref('Job'))),
        '403': RESPONSES.forbiddenRole,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/jobs/mine': {
    get: {
      tags: [TAG_JOBS],
      summary: 'The caller’s company postings, drafts included (employer)',
      operationId: 'listMyJobs',
      parameters: queryParameters(hrJobQuerySchema),
      responses: {
        '200': jsonResponse('A page of the company’s listings.', paginatedEnvelope('jobs', ref('Job'))),
        '403': RESPONSES.forbiddenRole,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/jobs/skills': {
    get: {
      tags: [TAG_JOBS],
      summary: 'Distinct skills across published listings',
      description: 'Backs the skill filter, so the filter only ever offers skills that match something.',
      operationId: 'listJobSkills',
      responses: {
        '200': jsonResponse(
          'The skill vocabulary in use.',
          wrappedEnvelope('skills', { type: 'array', items: { type: 'string' } }),
        ),
        ...AUTHENTICATED_ERRORS,
      },
    },
  },

  '/jobs/{id}': {
    get: {
      tags: [TAG_JOBS],
      summary: 'Listing detail',
      description: 'A draft is visible only to the company that owns it; to anyone else it is a 404.',
      operationId: 'getJob',
      parameters: [jobIdParameter],
      responses: {
        '200': jsonResponse('The listing.', wrappedEnvelope('job', ref('Job'))),
        '404': RESPONSES.notFound,
        ...VALIDATED_ERRORS,
      },
    },
    put: {
      tags: [TAG_JOBS],
      summary: 'Update a listing (owning employer)',
      operationId: 'updateJob',
      parameters: [jobIdParameter],
      requestBody: jsonBody(ref('UpdateJobInput')),
      responses: {
        '200': jsonResponse('Updated.', wrappedEnvelope('job', ref('Job'))),
        '403': RESPONSES.forbiddenRole,
        '404': RESPONSES.notFound,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/jobs/{id}/status': {
    patch: {
      tags: [TAG_JOBS],
      summary: 'Move a listing through its lifecycle (owning employer)',
      description:
        'Legal moves are `draft → published | closed`, `published → closed`, and `closed → published` to reopen. Anything else is a 409.',
      operationId: 'changeJobStatus',
      parameters: [jobIdParameter],
      requestBody: jsonBody(ref('JobStatusInput')),
      responses: {
        '200': jsonResponse('The listing at its new status.', wrappedEnvelope('job', ref('Job'))),
        '403': RESPONSES.forbiddenRole,
        '404': RESPONSES.notFound,
        '409': RESPONSES.conflict,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/jobs/{id}/apply': {
    post: {
      tags: [TAG_APPLICATIONS],
      summary: 'Apply to a listing (candidate)',
      description:
        'The résumé on file is **snapshotted** server-side at submission, so later profile edits never rewrite history. One application per candidate per job is enforced by a unique index, so two concurrent requests cannot both slip through — the second is a 409.',
      operationId: 'applyToJob',
      parameters: [jobIdParameter],
      requestBody: jsonBody(ref('ApplyInput')),
      responses: {
        '201': jsonResponse('Applied.', wrappedEnvelope('application', ref('MyApplication'))),
        '403': RESPONSES.forbiddenRole,
        '404': RESPONSES.notFound,
        '409': RESPONSES.conflict,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/jobs/{id}/applications': {
    get: {
      tags: [TAG_APPLICATIONS],
      summary: 'Applicants for one listing (owning employer)',
      description:
        'A deliberately narrow applicant card: name, location, skills, photo and the snapshotted résumé — never the candidate’s date of birth, mobile number or salary expectations.',
      operationId: 'listJobApplicants',
      parameters: [jobIdParameter, ...queryParameters(jobApplicantQuerySchema)],
      responses: {
        '200': jsonResponse(
          'A page of applicants.',
          paginatedEnvelope('applications', ref('Applicant')),
        ),
        '403': RESPONSES.forbiddenRole,
        '404': RESPONSES.notFound,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/applications': {
    get: {
      tags: [TAG_APPLICATIONS],
      summary: 'The caller’s own applications (candidate)',
      operationId: 'listMyApplications',
      parameters: queryParameters(myApplicationQuerySchema),
      responses: {
        '200': jsonResponse(
          'A page of applications.',
          paginatedEnvelope('applications', ref('MyApplication')),
        ),
        '403': RESPONSES.forbiddenRole,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/applications/job-ids': {
    get: {
      tags: [TAG_APPLICATIONS],
      summary: 'Ids of every job the caller has applied to (candidate)',
      description:
        'Lets the listing page mark "applied" without fetching every application. One small request instead of N.',
      operationId: 'listAppliedJobIds',
      responses: {
        '200': jsonResponse(
          'Job ids.',
          wrappedEnvelope('jobIds', { type: 'array', items: { type: 'string' } }),
        ),
        '403': RESPONSES.forbiddenRole,
        ...AUTHENTICATED_ERRORS,
      },
    },
  },

  '/applications/{id}/status': {
    patch: {
      tags: [TAG_APPLICATIONS],
      summary: 'Change an application’s status',
      description:
        'Open to both roles, because the *service* decides what each may set: an employer shortlists or rejects, a candidate withdraws, and `withdrawn` is terminal. Splitting this by role at the route would put one rule in two places. A status change the candidate did not make raises a notification for them.',
      operationId: 'changeApplicationStatus',
      parameters: [pathParameter('id', 'Id of the application.')],
      requestBody: jsonBody(ref('ApplicationStatusInput')),
      responses: {
        '200': jsonResponse(
          'The application at its new status.',
          wrappedEnvelope('application', {
            type: 'object',
            required: ['id', 'status'],
            properties: {
              id: { type: 'string' },
              status: {
                type: 'string',
                enum: ['applied', 'shortlisted', 'rejected', 'withdrawn'],
              },
            },
          }),
        ),
        '403': RESPONSES.forbiddenRole,
        '404': RESPONSES.notFound,
        '409': RESPONSES.conflict,
        ...VALIDATED_ERRORS,
      },
    },
  },
};
