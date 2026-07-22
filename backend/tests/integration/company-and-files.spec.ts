import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { FILE_KINDS } from '../../src/config/constants';
import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { HrProfileModel } from '../../src/database/models/hr-profile.model';
import { api, bearer, registerCandidate, registerHr } from '../helpers/api-client';
import { startTestServer, type TestServer } from '../helpers/test-server';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.stop();
});

beforeEach(async () => {
  await server.reset();
});

// A 1×1 transparent PNG — enough for a real multipart upload.
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const PDF_BYTES = Buffer.from('%PDF-1.4\n%fake résumé\n');

describe('GET /company/:id', () => {
  it('returns the company created during HR registration', async () => {
    const hr = await registerHr(server.app);
    const profile = await request(server.app)
      .get(api('/profile'))
      .set('Authorization', bearer(hr))
      .expect(200);
    const companyId = profile.body.data.profile.company.id as string;

    const response = await request(server.app)
      .get(api(`/company/${companyId}`))
      .set('Authorization', bearer(hr))
      .expect(200);

    expect(response.body.data.company).toMatchObject({ name: 'Acme Corp', slug: 'acme-corp' });
  });

  it('is readable by a candidate too', async () => {
    const hr = await registerHr(server.app);
    const candidate = await registerCandidate(server.app);
    const profile = await request(server.app)
      .get(api('/profile'))
      .set('Authorization', bearer(hr))
      .expect(200);

    await request(server.app)
      .get(api(`/company/${profile.body.data.profile.company.id as string}`))
      .set('Authorization', bearer(candidate))
      .expect(200);
  });

  it('answers 404 for an unknown id and 422 for a malformed one', async () => {
    const hr = await registerHr(server.app);

    const notFound = await request(server.app)
      .get(api('/company/507f1f77bcf86cd799439011'))
      .set('Authorization', bearer(hr))
      .expect(404);
    expect(notFound.body.error.code).toBe(ERROR_CODES.COMPANY_NOT_FOUND);

    await request(server.app)
      .get(api('/company/not-an-id'))
      .set('Authorization', bearer(hr))
      .expect(422);
  });
});

describe('PUT /company/:id', () => {
  const getCompanyId = async (hr: Awaited<ReturnType<typeof registerHr>>): Promise<string> => {
    const profile = await request(server.app)
      .get(api('/profile'))
      .set('Authorization', bearer(hr))
      .expect(200);
    return profile.body.data.profile.company.id as string;
  };

  it('lets the owner update the company', async () => {
    const hr = await registerHr(server.app);
    const companyId = await getCompanyId(hr);

    const response = await request(server.app)
      .put(api(`/company/${companyId}`))
      .set('Authorization', bearer(hr))
      .send({
        description: 'We build hiring software',
        websiteUrl: 'https://acme.test',
        linkedinUrl: 'https://www.linkedin.com/company/acme',
        locations: ['Pune', 'pune', 'Bengaluru'],
      })
      .expect(200);

    expect(response.body.data.company).toMatchObject({
      description: 'We build hiring software',
      websiteUrl: 'https://acme.test',
      locations: ['Pune', 'Bengaluru'],
    });
  });

  it('refuses an owner of a different company with 403', async () => {
    const owner = await registerHr(server.app);
    const outsider = await registerHr(server.app, {
      email: 'other@other.test',
      company: { name: 'Other Corp' },
    });
    const companyId = await getCompanyId(owner);

    const response = await request(server.app)
      .put(api(`/company/${companyId}`))
      .set('Authorization', bearer(outsider))
      .send({ name: 'Hijacked' })
      .expect(403);

    expect(response.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });

  it('refuses a candidate with 403', async () => {
    const hr = await registerHr(server.app);
    const candidate = await registerCandidate(server.app);
    const companyId = await getCompanyId(hr);

    await request(server.app)
      .put(api(`/company/${companyId}`))
      .set('Authorization', bearer(candidate))
      .send({ name: 'Hijacked' })
      .expect(403);
  });

  it.each([
    ['a bad website', { websiteUrl: 'not-a-url' }],
    ['a non-LinkedIn LinkedIn URL', { linkedinUrl: 'https://evil.test/linkedin' }],
    ['a malformed domain', { domain: 'not a domain' }],
    ['an empty payload', {}],
  ])('rejects %s with 422', async (_case, payload) => {
    const hr = await registerHr(server.app);
    const companyId = await getCompanyId(hr);

    await request(server.app)
      .put(api(`/company/${companyId}`))
      .set('Authorization', bearer(hr))
      .send(payload)
      .expect(422);
  });
});

describe('POST /company/register', () => {
  it('refuses when the HR is already linked to a company', async () => {
    const hr = await registerHr(server.app);

    const response = await request(server.app)
      .post(api('/company/register'))
      .set('Authorization', bearer(hr))
      .send({ name: 'Second Corp' })
      .expect(409);

    expect(response.body.error.code).toBe(ERROR_CODES.COMPANY_ALREADY_LINKED);
  });

  it('links a company when the HR profile has none, in one transaction', async () => {
    const hr = await registerHr(server.app);
    // Simulate an account whose company link was never established.
    await HrProfileModel.updateOne({}, { $unset: { companyId: '' } }).exec();

    const response = await request(server.app)
      .post(api('/company/register'))
      .set('Authorization', bearer(hr))
      .send({ name: 'Rebuilt Corp', domain: 'rebuilt.test' })
      .expect(201);

    expect(response.body.data.company).toMatchObject({
      name: 'Rebuilt Corp',
      slug: 'rebuilt-corp',
    });

    const profile = await HrProfileModel.findOne({}).lean();
    expect(profile?.companyId?.toHexString()).toBe(response.body.data.company.id);
  });

  it('refuses a candidate with 403', async () => {
    const candidate = await registerCandidate(server.app);

    await request(server.app)
      .post(api('/company/register'))
      .set('Authorization', bearer(candidate))
      .send({ name: 'Acme' })
      .expect(403);
  });
});

describe('POST /files and GET /files/:id', () => {
  it('uploads a profile picture and streams it back to its owner', async () => {
    const candidate = await registerCandidate(server.app);

    const upload = await request(server.app)
      .post(api('/files'))
      .set('Authorization', bearer(candidate))
      .field('kind', FILE_KINDS.PROFILE_PIC)
      .attach('file', PNG_BYTES, { filename: 'me.png', contentType: 'image/png' })
      .expect(201);

    expect(upload.body.data.file).toMatchObject({
      kind: FILE_KINDS.PROFILE_PIC,
      mimeType: 'image/png',
      originalName: 'me.png',
    });
    expect(upload.body.data.file.storageKey).toBeUndefined();

    const download = await request(server.app)
      .get(api(`/files/${upload.body.data.file.id as string}`))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(download.headers['content-type']).toContain('image/png');
    expect(Buffer.compare(download.body as Buffer, PNG_BYTES)).toBe(0);
  });

  it('uploads a résumé and links it to the profile', async () => {
    const candidate = await registerCandidate(server.app);

    const upload = await request(server.app)
      .post(api('/files'))
      .set('Authorization', bearer(candidate))
      .field('kind', FILE_KINDS.RESUME)
      .attach('file', PDF_BYTES, { filename: 'cv.pdf', contentType: 'application/pdf' })
      .expect(201);

    const profile = await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(candidate))
      .send({ resumeFileId: upload.body.data.file.id })
      .expect(200);

    expect(profile.body.data.profile.resumeFileId).toBe(upload.body.data.file.id);
    expect(
      (profile.body.data.completion.missing as { key: string }[]).some(
        (item) => item.key === 'resume',
      ),
    ).toBe(false);
  });

  it('rejects a mime type that does not match the declared kind', async () => {
    const candidate = await registerCandidate(server.app);

    const response = await request(server.app)
      .post(api('/files'))
      .set('Authorization', bearer(candidate))
      .field('kind', FILE_KINDS.RESUME)
      .attach('file', PNG_BYTES, { filename: 'me.png', contentType: 'image/png' })
      .expect(422);

    expect(response.body.error.code).toBe(ERROR_CODES.UNSUPPORTED_FILE_TYPE);
  });

  it('rejects an unknown kind', async () => {
    const candidate = await registerCandidate(server.app);

    await request(server.app)
      .post(api('/files'))
      .set('Authorization', bearer(candidate))
      .field('kind', 'passport_scan')
      .attach('file', PNG_BYTES, { filename: 'me.png', contentType: 'image/png' })
      .expect(422);
  });

  it('rejects an upload with no file attached', async () => {
    const candidate = await registerCandidate(server.app);

    const response = await request(server.app)
      .post(api('/files'))
      .set('Authorization', bearer(candidate))
      .field('kind', FILE_KINDS.PROFILE_PIC)
      .expect(422);

    expect(response.body.error.code).toBe(ERROR_CODES.FILE_REQUIRED);
  });

  it('hides another user’s file behind a 404', async () => {
    const owner = await registerCandidate(server.app);
    const intruder = await registerCandidate(server.app, {
      email: 'intruder@example.com',
      firstName: 'Mal',
      lastName: 'Lory',
    });

    const upload = await request(server.app)
      .post(api('/files'))
      .set('Authorization', bearer(owner))
      .field('kind', FILE_KINDS.PROFILE_PIC)
      .attach('file', PNG_BYTES, { filename: 'me.png', contentType: 'image/png' })
      .expect(201);

    const response = await request(server.app)
      .get(api(`/files/${upload.body.data.file.id as string}`))
      .set('Authorization', bearer(intruder))
      .expect(404);

    expect(response.body.error.code).toBe(ERROR_CODES.FILE_NOT_FOUND);
  });

  it('requires authentication to upload or download', async () => {
    await request(server.app).post(api('/files')).expect(401);
    await request(server.app).get(api('/files/507f1f77bcf86cd799439011')).expect(401);
  });
});
