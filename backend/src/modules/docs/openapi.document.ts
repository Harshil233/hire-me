import { API_PREFIX } from '../../config/constants';
import { COMPONENT_SCHEMAS } from './openapi.components';
import { AUTH_PATHS, SECTION_PATHS } from './openapi.paths.auth';
import { JOB_PATHS } from './openapi.paths.job';
import { PLATFORM_PATHS } from './openapi.paths.platform';
import type { OpenApiDocument, TagObject } from './openapi.types';

/**
 * Assembles the published API contract.
 *
 * Every schema in it is the Zod schema the API validates with, converted at boot — so
 * the documentation is generated *from* the implementation rather than maintained
 * alongside it, and the two cannot disagree.
 */

const TAGS: readonly TagObject[] = [
  { name: 'Auth', description: 'Registration, role-scoped sign-in, and the session lifecycle.' },
  { name: 'Profile', description: 'The caller’s own profile, dispatched by role.' },
  {
    name: 'Profile sections',
    description:
      'Experience, education, certifications and projects. One generic owned-resource stack serves all four.',
  },
  { name: 'Jobs', description: 'Listings: browsing, posting, and the draft → published → closed lifecycle.' },
  { name: 'Applications', description: 'Applying, tracking, and employer review.' },
  { name: 'Talent pool', description: 'Employers browsing candidates who are open to work.' },
  { name: 'Company', description: 'The employer’s organisation.' },
  { name: 'Notifications', description: 'Durable in-app notifications.' },
  { name: 'Outreach', description: 'Email campaigns inviting candidates to a listing.' },
  { name: 'Files', description: 'Photo, résumé and logo upload behind a swappable storage adapter.' },
  { name: 'Health', description: 'Liveness, used by the container healthcheck.' },
];

const DESCRIPTION = `
A job portal for two audiences: **candidates** looking for a role, and **employers** hiring for one.

### Envelope

Every response — success or failure — uses one shape:

\`\`\`jsonc
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "JOB_NOT_FOUND", "message": "…", "details": [] } }
\`\`\`

### Authentication

Sign in through the path for your role (\`/candidate/login\` or \`/hr/login\`). The response carries a
short-lived **access token** for the \`Authorization: Bearer\` header; the **refresh token** is set as
an httpOnly cookie the browser sends back to \`/refresh\` on its own.

To try a protected endpoint here: call a login endpoint, copy \`data.accessToken\`, then press
**Authorize** and paste it.

### Conventions worth knowing

- Validation failures answer **422** with per-field \`error.details\`.
- A record owned by someone else answers **404, never 403**, so the API cannot be used to probe
  for other accounts.
- \`403\` means the *account type* is wrong for the endpoint — an employer applying for a job.
- Ids are Mongo ObjectIds: 24 hex characters.
`.trim();

export interface OpenApiOptions {
  /** Published as `info.version`. */
  readonly version: string;
}

export const buildOpenApiDocument = ({ version }: OpenApiOptions): OpenApiDocument => ({
  openapi: '3.1.0',
  info: {
    title: 'Hire Me API',
    version,
    description: DESCRIPTION,
  },
  // Relative on purpose: the document is then correct on localhost, in Docker and behind
  // any proxy, without a "public URL" environment variable that can be set wrongly.
  servers: [{ url: API_PREFIX, description: 'This server' }],
  // Protected by default; the handful of public endpoints opt out with `security: []`.
  security: [{ bearerAuth: [] }],
  tags: TAGS,
  paths: {
    ...AUTH_PATHS,
    ...SECTION_PATHS,
    ...JOB_PATHS,
    ...PLATFORM_PATHS,
  },
  components: {
    schemas: COMPONENT_SCHEMAS,
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'The access token from a login, registration or refresh response. Expires quickly — call `/refresh` for a new one.',
      },
      refreshCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'hire_me_refresh',
        description:
          'Set by the server on sign-in and sent back automatically by the browser. Rotated on every use; replaying a spent token revokes the whole family.',
      },
    },
  },
});
