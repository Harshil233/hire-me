import { describe, expect, it } from 'vitest';

import { certificationConfig } from '../configs/certification.config';
import { educationConfig } from '../configs/education.config';
import { experienceConfig } from '../configs/experience.config';
import { projectConfig } from '../configs/project.config';

const EXPERIENCE = {
  id: 'exp-1',
  title: 'Backend Engineer',
  companyName: 'Acme',
  description: 'Owned payments',
  startDate: '2021-01-01T00:00:00.000Z',
  endDate: '2023-01-01T00:00:00.000Z',
  isCurrent: false,
  skills: ['TypeScript'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('every section config', () => {
  const configs = [experienceConfig, educationConfig, certificationConfig, projectConfig];

  it.each(configs)('$key declares a distinct API contract', (config) => {
    expect(config.resourcePath).toBe(`/${config.key}`);
    expect(config.pluralKey.startsWith(config.singularKey)).toBe(true);
    expect(config.addLabel.length).toBeGreaterThan(0);
  });

  it.each(configs)('$key round-trips its empty values through its own schema', (config) => {
    // Empty values are the "add" defaults: they must be shaped correctly even though
    // required fields are still blank.
    const result = config.formSchema.safeParse(config.emptyValues);

    expect(result.success).toBe(false);
    expect(Object.keys(config.emptyValues as object).length).toBeGreaterThan(0);
  });
});

describe('experienceConfig', () => {
  it('maps an item into date-input values', () => {
    const values = experienceConfig.toValues(EXPERIENCE);

    expect(values.startDate).toBe('2021-01-01');
    expect(values.endDate).toBe('2023-01-01');
    expect(values.skills).toEqual(['TypeScript']);
  });

  it('drops the end date when the role is ongoing', () => {
    const payload = experienceConfig.toPayload({
      ...experienceConfig.toValues(EXPERIENCE),
      isCurrent: true,
    });

    expect(payload.endDate).toBeUndefined();
    expect(payload.isCurrent).toBe(true);
  });

  it('omits a blank description rather than sending an empty string', () => {
    const payload = experienceConfig.toPayload({
      ...experienceConfig.toValues(EXPERIENCE),
      description: '   ',
    });

    expect(payload.description).toBeUndefined();
  });

  it('presents the role with its company, dates and skills', () => {
    const view = experienceConfig.present(EXPERIENCE);

    expect(view.title).toBe('Backend Engineer');
    expect(view.subtitle).toBe('Acme');
    expect(view.meta).toMatch(/Jan 2021 — Jan 2023/);
    expect(view.tags).toEqual(['TypeScript']);
  });

  it('presents an ongoing role as "Present"', () => {
    expect(
      experienceConfig.present({ ...EXPERIENCE, endDate: undefined, isCurrent: true }).meta,
    ).toMatch(/Present/);
  });

  it('rejects an end date before the start date', () => {
    const result = experienceConfig.formSchema.safeParse({
      title: 'Engineer',
      companyName: 'Acme',
      startDate: '2023-01-01',
      endDate: '2021-01-01',
      isCurrent: false,
      skills: [],
      description: '',
    });

    expect(result.success).toBe(false);
  });
});

describe('educationConfig', () => {
  const EDUCATION = {
    id: 'edu-1',
    college: 'IIT Bombay',
    course: 'Computer Science',
    degree: 'B.Tech',
    startDate: '2016-07-01T00:00:00.000Z',
    endDate: '2020-06-01T00:00:00.000Z',
    isCurrent: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('presents the degree and course together', () => {
    const view = educationConfig.present(EDUCATION);

    expect(view.title).toBe('B.Tech · Computer Science');
    expect(view.subtitle).toBe('IIT Bombay');
  });

  it('round-trips its values', () => {
    const payload = educationConfig.toPayload(educationConfig.toValues(EDUCATION));

    expect(payload).toMatchObject({ college: 'IIT Bombay', degree: 'B.Tech' });
  });
});

describe('certificationConfig', () => {
  const CERTIFICATION = {
    id: 'cert-1',
    title: 'AWS SA',
    issuedBy: 'Amazon',
    issuedOn: '2023-05-01T00:00:00.000Z',
    expiresOn: '2026-05-01T00:00:00.000Z',
    credentialUrl: 'https://credly.test/1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('shows both the issue and expiry dates', () => {
    expect(certificationConfig.present(CERTIFICATION).meta).toMatch(/Issued .* · Expires /);
  });

  it('shows only the issue date when it does not expire', () => {
    const view = certificationConfig.present({ ...CERTIFICATION, expiresOn: undefined });

    expect(view.meta).toMatch(/^Issued /);
    expect(view.meta).not.toMatch(/Expires/);
  });

  it('exposes the credential link', () => {
    expect(certificationConfig.present(CERTIFICATION).link).toBe('https://credly.test/1');
  });

  it('rejects an expiry before the issue date', () => {
    const result = certificationConfig.formSchema.safeParse({
      title: 'AWS SA',
      issuedBy: 'Amazon',
      issuedOn: '2023-05-01',
      expiresOn: '2022-01-01',
      credentialUrl: '',
      description: '',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['expiresOn']);
  });
});

describe('projectConfig', () => {
  const PROJECT = {
    id: 'proj-1',
    title: 'Job portal',
    description: 'A hiring platform',
    skills: ['React'],
    domain: 'HR Tech',
    link: 'https://github.test/hire-me',
    startDate: '2024-01-01T00:00:00.000Z',
    isCurrent: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('presents the domain, link and technologies', () => {
    const view = projectConfig.present(PROJECT);

    expect(view.subtitle).toBe('HR Tech');
    expect(view.link).toBe('https://github.test/hire-me');
    expect(view.tags).toEqual(['React']);
  });

  it('rejects a malformed link', () => {
    const result = projectConfig.formSchema.safeParse({
      ...projectConfig.toValues(PROJECT),
      link: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });
});
