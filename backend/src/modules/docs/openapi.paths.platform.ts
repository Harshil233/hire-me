import { candidateQuerySchema } from '../candidate/candidate.schema';
import { notificationQuerySchema } from '../notification/notification.schema';
import { outreachQuerySchema } from '../outreach/outreach.schema';
import {
  binaryResponse,
  jsonBody,
  jsonResponse,
  paginatedEnvelope,
  pathParameter,
  queryParameters,
  ref,
  successEnvelope,
  wrappedEnvelope,
} from './openapi.builder';
import { RESPONSES, VALIDATED_ERRORS } from './openapi.responses';
import type { PathItemObject, RequestBodyObject } from './openapi.types';

/** Company, talent pool, notifications, outreach, files and health. */

const TAG_COMPANY = 'Company';
const TAG_TALENT = 'Talent pool';
const TAG_NOTIFICATIONS = 'Notifications';
const TAG_OUTREACH = 'Outreach';
const TAG_FILES = 'Files';
const TAG_HEALTH = 'Health';

/** Multipart upload — the one endpoint that does not take JSON. */
const uploadBody: RequestBodyObject = {
  description: 'Multipart form data. The MIME type is checked against the declared `kind`.',
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        required: ['file', 'kind'],
        properties: {
          file: { type: 'string', format: 'binary' },
          kind: {
            type: 'string',
            enum: ['profile_pic', 'resume', 'company_logo'],
            description:
              'Decides which MIME types are accepted: images for a photo or logo, PDF/DOC/DOCX for a résumé.',
          },
        },
      },
    },
  },
};

export const PLATFORM_PATHS: Readonly<Record<string, PathItemObject>> = {
  /* ---------------------------------------------------------------- company */

  '/company/register': {
    post: {
      tags: [TAG_COMPANY],
      summary: 'Register a company for an employer that has none',
      description:
        'Only needed by an HR account created without one. Standard HR sign-up creates the company in the same transaction.',
      operationId: 'registerCompany',
      requestBody: jsonBody(ref('CreateCompanyInput')),
      responses: {
        '201': jsonResponse('Created.', wrappedEnvelope('company', ref('Company'))),
        '403': RESPONSES.forbiddenRole,
        '409': RESPONSES.conflict,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/company/{id}': {
    get: {
      tags: [TAG_COMPANY],
      summary: 'Company detail',
      operationId: 'getCompany',
      parameters: [pathParameter('id', 'Id of the company.')],
      responses: {
        '200': jsonResponse('The company.', wrappedEnvelope('company', ref('Company'))),
        '404': RESPONSES.notFound,
        ...VALIDATED_ERRORS,
      },
    },
    put: {
      tags: [TAG_COMPANY],
      summary: 'Update the company (owning employer)',
      operationId: 'updateCompany',
      parameters: [pathParameter('id', 'Id of the company.')],
      requestBody: jsonBody(ref('UpdateCompanyInput')),
      responses: {
        '200': jsonResponse('Updated.', wrappedEnvelope('company', ref('Company'))),
        '403': RESPONSES.forbiddenRole,
        '404': RESPONSES.notFound,
        ...VALIDATED_ERRORS,
      },
    },
  },

  /* ----------------------------------------------------------- talent pool */

  '/candidates': {
    get: {
      tags: [TAG_TALENT],
      summary: 'Browse candidates open to work (employer)',
      description:
        'Employer-only: a candidate has no business enumerating other candidates. The payload is a browse card regardless of who asks.',
      operationId: 'browseCandidates',
      parameters: queryParameters(candidateQuerySchema),
      responses: {
        '200': jsonResponse(
          'A page of candidates.',
          paginatedEnvelope('candidates', ref('CandidateBrowseItem')),
        ),
        '403': RESPONSES.forbiddenRole,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/candidates/{userId}': {
    get: {
      tags: [TAG_TALENT],
      summary: 'One candidate in full (employer)',
      description: 'The browse card plus their experience, education, projects and certifications.',
      operationId: 'getCandidate',
      parameters: [pathParameter('userId', 'The candidate’s **user** id.')],
      responses: {
        '200': jsonResponse('The candidate.', wrappedEnvelope('candidate', { type: 'object' })),
        '403': RESPONSES.forbiddenRole,
        '404': RESPONSES.notFound,
        ...VALIDATED_ERRORS,
      },
    },
  },

  /* --------------------------------------------------------- notifications */

  '/notifications': {
    get: {
      tags: [TAG_NOTIFICATIONS],
      summary: 'The caller’s inbox and unread count',
      description:
        'Durable rows, not a live feed: the client reads them when the shell mounts. No polling, no socket.',
      operationId: 'listNotifications',
      parameters: queryParameters(notificationQuerySchema),
      responses: {
        '200': jsonResponse(
          'A page of notifications.',
          successEnvelope({
            type: 'object',
            required: ['notifications', 'unreadCount', 'pagination'],
            properties: {
              notifications: { type: 'array', items: ref('Notification') },
              unreadCount: { type: 'integer', minimum: 0 },
              pagination: ref('PaginationMeta'),
            },
          }),
        ),
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/notifications/read': {
    patch: {
      tags: [TAG_NOTIFICATIONS],
      summary: 'Mark one notification read, or all of them',
      operationId: 'markNotificationsRead',
      requestBody: jsonBody(ref('MarkReadInput')),
      responses: {
        '200': jsonResponse(
          'How many rows were marked.',
          wrappedEnvelope('markedCount', { type: 'integer', minimum: 0 }),
        ),
        ...VALIDATED_ERRORS,
      },
    },
  },

  /* --------------------------------------------------------------- outreach */

  '/outreach/campaigns': {
    get: {
      tags: [TAG_OUTREACH],
      summary: 'The company’s campaigns (employer)',
      operationId: 'listCampaigns',
      parameters: queryParameters(outreachQuerySchema),
      responses: {
        '200': jsonResponse('A page of campaigns.', paginatedEnvelope('campaigns', ref('Campaign'))),
        '403': RESPONSES.forbiddenRole,
        ...VALIDATED_ERRORS,
      },
    },
    post: {
      tags: [TAG_OUTREACH],
      summary: 'Invite candidates to one of the company’s listings (employer)',
      description:
        'Queued, not sent inline: a background worker delivers in batches so a slow provider never blocks the request. Recipients are resolved from the audience filter at creation time; anyone who has opted out of outreach is skipped. Per-campaign and daily ceilings apply.',
      operationId: 'createCampaign',
      requestBody: jsonBody(ref('CreateCampaignInput')),
      responses: {
        '201': jsonResponse('Queued.', wrappedEnvelope('campaign', ref('Campaign'))),
        '403': RESPONSES.forbiddenRole,
        '404': RESPONSES.notFound,
        '409': RESPONSES.conflict,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/outreach/campaigns/preview': {
    post: {
      tags: [TAG_OUTREACH],
      summary: 'Count who a campaign would reach, without sending (employer)',
      operationId: 'previewCampaign',
      requestBody: jsonBody(ref('CreateCampaignInput')),
      responses: {
        '200': jsonResponse(
          'How many candidates match the audience.',
          wrappedEnvelope('recipientCount', { type: 'integer', minimum: 0 }),
        ),
        '403': RESPONSES.forbiddenRole,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/outreach/campaigns/{id}': {
    get: {
      tags: [TAG_OUTREACH],
      summary: 'One campaign and its delivery counts (employer)',
      operationId: 'getCampaign',
      parameters: [pathParameter('id', 'Id of the campaign.')],
      responses: {
        '200': jsonResponse('The campaign.', wrappedEnvelope('campaign', ref('Campaign'))),
        '403': RESPONSES.forbiddenRole,
        '404': RESPONSES.notFound,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/outreach/unsubscribe': {
    post: {
      tags: [TAG_OUTREACH],
      summary: 'Opt out of outreach email',
      description:
        'Deliberately **public**: it is reached from a link in an email by someone with no session and, quite possibly, no intention of ever signing in again. The token is signed, so a link cannot be forged for another account.',
      operationId: 'unsubscribeFromOutreach',
      security: [],
      requestBody: jsonBody(ref('UnsubscribeInput')),
      responses: {
        '200': jsonResponse(
          'Opted out.',
          wrappedEnvelope('unsubscribed', { type: 'boolean', const: true }),
        ),
        '422': RESPONSES.validation,
        '429': RESPONSES.rateLimited,
      },
    },
  },

  /* ------------------------------------------------------------------ files */

  '/files': {
    post: {
      tags: [TAG_FILES],
      summary: 'Upload a photo, résumé or company logo',
      description:
        'Storage sits behind an adapter, so the local disk can be swapped for object storage without touching a service. Size and MIME type are both enforced.',
      operationId: 'uploadFile',
      requestBody: uploadBody,
      responses: {
        '201': jsonResponse('Stored.', wrappedEnvelope('file', ref('File'))),
        '413': RESPONSES.tooLarge,
        ...VALIDATED_ERRORS,
      },
    },
  },

  '/files/{id}': {
    get: {
      tags: [TAG_FILES],
      summary: 'Stream a file',
      description:
        'The owner may always read their own file. An employer may additionally read a candidate’s résumé or photo — but only one attached to an application made to their own company.',
      operationId: 'downloadFile',
      parameters: [pathParameter('id', 'Id of the file.')],
      responses: {
        '200': binaryResponse('The file stream.'),
        '404': RESPONSES.notFound,
        ...VALIDATED_ERRORS,
      },
    },
  },

  /* ----------------------------------------------------------------- health */

  '/health': {
    get: {
      tags: [TAG_HEALTH],
      summary: 'Liveness and a database ping',
      description: 'Public, and the endpoint the container HEALTHCHECK calls.',
      operationId: 'getHealth',
      security: [],
      responses: {
        '200': jsonResponse('Healthy.', successEnvelope(ref('Health'))),
        '503': jsonResponse('The database did not answer.', successEnvelope(ref('Health'))),
      },
    },
  },
};
