import {
  emptyResponse,
  jsonBody,
  jsonResponse,
  pathParameter,
  ref,
  successEnvelope,
  wrappedEnvelope,
} from './openapi.builder';
import { AUTHENTICATED_ERRORS, RESPONSES, VALIDATED_ERRORS } from './openapi.responses';
import type { PathItemObject } from './openapi.types';

/** Registration, sign-in, session lifecycle, the profile, and the four owned sections. */

const TAG_AUTH = 'Auth';
const TAG_PROFILE = 'Profile';
const TAG_SECTIONS = 'Profile sections';

/** Public endpoints opt out of the document-level bearer requirement. */
const PUBLIC = [] as const;

const registrationResponses = {
  '201': jsonResponse(
    'Account created. The refresh token is set as an httpOnly cookie; the access token is in the body.',
    ref('AuthSession'),
  ),
  '409': RESPONSES.conflict,
  '422': RESPONSES.validation,
  '429': RESPONSES.rateLimited,
};

/**
 * Sign-in is role-scoped: each role has its own path and refuses the other's accounts.
 * A candidate presenting correct credentials to `/hr/login` receives the same generic
 * 401 as a wrong password, so the endpoint cannot be used to discover which role an
 * email belongs to.
 */
const loginPath = (role: 'candidate' | 'hr', label: string): PathItemObject => ({
  post: {
    tags: [TAG_AUTH],
    summary: `Sign in as ${label}`,
    description:
      'Answers `INVALID_CREDENTIALS` for a wrong password *and* for a correct password belonging to the other role — the response cannot be used to enumerate accounts or roles.',
    operationId: `login${role === 'hr' ? 'Hr' : 'Candidate'}`,
    security: PUBLIC,
    requestBody: jsonBody(ref('LoginInput')),
    responses: {
      '200': jsonResponse('Signed in.', ref('AuthSession')),
      '401': RESPONSES.unauthenticated,
      '422': RESPONSES.validation,
      '429': RESPONSES.rateLimited,
    },
  },
});

export const AUTH_PATHS: Readonly<Record<string, PathItemObject>> = {
  '/candidate/register': {
    post: {
      tags: [TAG_AUTH],
      summary: 'Register a candidate',
      operationId: 'registerCandidate',
      security: PUBLIC,
      requestBody: jsonBody(ref('RegisterCandidateInput')),
      responses: registrationResponses,
    },
  },

  '/hr/register': {
    post: {
      tags: [TAG_AUTH],
      summary: 'Register an employer, and their company with them',
      description:
        'The user, the company and the HR profile are written in **one transaction** — a failure part-way through leaves no orphaned account behind. This is why MongoDB runs as a replica set.',
      operationId: 'registerHr',
      security: PUBLIC,
      requestBody: jsonBody(ref('RegisterHrInput')),
      responses: registrationResponses,
    },
  },

  '/candidate/login': loginPath('candidate', 'a candidate'),
  '/hr/login': loginPath('hr', 'an employer'),

  '/refresh': {
    post: {
      tags: [TAG_AUTH],
      summary: 'Rotate the refresh token and mint a new access token',
      description:
        'Authenticated by the httpOnly cookie, not a bearer token. Rotation is single-use: replaying a spent token is treated as theft and revokes the entire token family.',
      operationId: 'refreshSession',
      security: PUBLIC,
      responses: {
        '200': jsonResponse('Rotated.', ref('AuthSession')),
        '401': RESPONSES.unauthenticated,
        '429': RESPONSES.rateLimited,
      },
    },
  },

  '/logout': {
    post: {
      tags: [TAG_AUTH],
      summary: 'Revoke the session',
      description: 'Clears the cookie and revokes the whole family. Safe to call without a session.',
      operationId: 'logout',
      security: PUBLIC,
      responses: {
        '200': jsonResponse(
          'Signed out.',
          successEnvelope({
            type: 'object',
            required: ['loggedOut'],
            properties: { loggedOut: { type: 'boolean', const: true } },
          }),
        ),
      },
    },
  },

  '/me': {
    get: {
      tags: [TAG_AUTH],
      summary: 'The signed-in account',
      operationId: 'getCurrentUser',
      responses: {
        '200': jsonResponse(
          'The account behind the access token.',
          wrappedEnvelope('user', {
            type: 'object',
            required: ['id', 'email', 'role'],
            properties: {
              id: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['candidate', 'hr'] },
            },
          }),
        ),
        ...AUTHENTICATED_ERRORS,
      },
    },
  },

  '/profile': {
    get: {
      tags: [TAG_PROFILE],
      summary: 'The caller’s profile and completion breakdown',
      description:
        'Role-dispatched through a strategy: the same route returns a candidate profile or an HR profile. Adding a third role means adding a class, not an `if`.',
      operationId: 'getProfile',
      responses: {
        '200': jsonResponse('The profile for the caller’s role.', successEnvelope(ref('ProfileView'))),
        ...AUTHENTICATED_ERRORS,
      },
    },
    put: {
      tags: [TAG_PROFILE],
      summary: 'Partially update the caller’s profile',
      description:
        'The body is validated against the schema for the caller’s role — `UpdateCandidateProfileInput` or `UpdateHrProfileInput`. Every field is optional; omitted fields are left untouched.',
      operationId: 'updateProfile',
      requestBody: jsonBody({
        oneOf: [ref('UpdateCandidateProfileInput'), ref('UpdateHrProfileInput')],
      }),
      responses: {
        '200': jsonResponse('The updated profile.', successEnvelope(ref('ProfileView'))),
        ...VALIDATED_ERRORS,
      },
    },
  },
};

/* -------------------------------------------------------------------------- */
/* Owned profile sections                                                      */
/* -------------------------------------------------------------------------- */

interface SectionConfig {
  /** Route segment, e.g. `experience`. */
  readonly path: string;
  /** Human label used in the summaries. */
  readonly label: string;
  /** Key the collection is returned under. */
  readonly collectionKey: string;
  /** Component name of the response entity. */
  readonly entity: string;
  /** Component name of the request body. */
  readonly input: string;
}

const SECTIONS: readonly SectionConfig[] = [
  {
    path: 'experience',
    label: 'work experience',
    collectionKey: 'experiences',
    entity: 'Experience',
    input: 'ExperienceInput',
  },
  {
    path: 'education',
    label: 'education',
    collectionKey: 'educations',
    entity: 'Education',
    input: 'EducationInput',
  },
  {
    path: 'certification',
    label: 'certification',
    collectionKey: 'certifications',
    entity: 'Certification',
    input: 'CertificationInput',
  },
  {
    path: 'project',
    label: 'project',
    collectionKey: 'projects',
    entity: 'Project',
    input: 'ProjectInput',
  },
];

/** Capitalises a route segment for use inside an `operationId`. */
const pascal = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

/**
 * The four sections share one repository base, one service and one controller, so they
 * share one route shape too. Generating the documentation the same way it is generated
 * in code keeps the two from diverging (CLAUDE.md §9).
 */
const sectionPaths = (section: SectionConfig): Readonly<Record<string, PathItemObject>> => {
  const name = pascal(section.path);
  const entityRef = ref(section.entity);

  return {
    [`/${section.path}`]: {
      get: {
        tags: [TAG_SECTIONS],
        summary: `List the caller’s ${section.label} entries`,
        operationId: `list${name}`,
        responses: {
          '200': jsonResponse('The caller’s entries.', wrappedEnvelope(section.collectionKey, {
            type: 'array',
            items: entityRef,
          })),
          '401': RESPONSES.unauthenticated,
          '403': RESPONSES.forbiddenRole,
          '429': RESPONSES.rateLimited,
        },
      },
      post: {
        tags: [TAG_SECTIONS],
        summary: `Add a ${section.label} entry`,
        operationId: `create${name}`,
        requestBody: jsonBody(ref(section.input)),
        responses: {
          '201': jsonResponse('Created.', wrappedEnvelope(section.path, entityRef)),
          '403': RESPONSES.forbiddenRole,
          ...VALIDATED_ERRORS,
        },
      },
    },

    [`/${section.path}/{id}`]: {
      put: {
        tags: [TAG_SECTIONS],
        summary: `Replace a ${section.label} entry`,
        description: 'Full-replace semantics: the body is the complete new entry.',
        operationId: `update${name}`,
        parameters: [pathParameter('id', `Id of the ${section.label} entry.`)],
        requestBody: jsonBody(ref(section.input)),
        responses: {
          '200': jsonResponse('Updated.', wrappedEnvelope(section.path, entityRef)),
          '403': RESPONSES.forbiddenRole,
          '404': RESPONSES.notFound,
          ...VALIDATED_ERRORS,
        },
      },
      delete: {
        tags: [TAG_SECTIONS],
        summary: `Delete a ${section.label} entry`,
        operationId: `delete${name}`,
        parameters: [pathParameter('id', `Id of the ${section.label} entry.`)],
        responses: {
          '204': emptyResponse('Deleted.'),
          '403': RESPONSES.forbiddenRole,
          '404': RESPONSES.notFound,
          ...AUTHENTICATED_ERRORS,
        },
      },
    },
  };
};

export const SECTION_PATHS: Readonly<Record<string, PathItemObject>> = SECTIONS.reduce<
  Record<string, PathItemObject>
>((paths, section) => Object.assign(paths, sectionPaths(section)), {});
