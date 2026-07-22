import { describe, expect, it, vi } from 'vitest';

import type { Company, ICompanyRepository } from '../company.interface';
import { CompanyDirectoryAdapter } from '../company-directory.adapter';

const NOW = new Date('2026-03-01T10:00:00.000Z');

const company = (id: string, name: string): Company => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  locations: [],
  logoFileId: 'file-1',
  createdByUserId: 'hr-1',
  createdAt: NOW,
  updatedAt: NOW,
});

const createAdapter = (
  companies: Company[],
): { adapter: CompanyDirectoryAdapter; repository: ICompanyRepository } => {
  const repository = {
    findById: vi.fn(async () => companies[0] ?? null),
    findManyByIds: vi.fn(async () => companies),
    existsBySlug: vi.fn(async () => false),
    existsByDomain: vi.fn(async () => false),
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as ICompanyRepository;

  return { adapter: new CompanyDirectoryAdapter(repository), repository };
};

describe('CompanyDirectoryAdapter', () => {
  it('returns headline fields keyed by company id', async () => {
    const { adapter } = createAdapter([company('company-1', 'Acme Corp')]);

    const summaries = await adapter.findSummaries(['company-1']);

    expect(summaries.get('company-1')).toEqual({
      id: 'company-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      logoFileId: 'file-1',
    });
  });

  it('exposes only headline fields, never the whole company', async () => {
    const { adapter } = createAdapter([company('company-1', 'Acme Corp')]);

    const summary = await adapter.findSummaries(['company-1']);

    expect(Object.keys(summary.get('company-1') ?? {}).sort()).toEqual([
      'id',
      'logoFileId',
      'name',
      'slug',
    ]);
  });

  it('deduplicates ids before hitting the repository', async () => {
    const { adapter, repository } = createAdapter([company('company-1', 'Acme Corp')]);

    await adapter.findSummaries(['company-1', 'company-1', 'company-1']);

    expect(repository.findManyByIds).toHaveBeenCalledWith(['company-1']);
  });

  it('omits ids that do not resolve rather than inventing an entry', async () => {
    const { adapter } = createAdapter([]);

    const summaries = await adapter.findSummaries(['missing']);

    expect(summaries.size).toBe(0);
    expect(summaries.get('missing')).toBeUndefined();
  });

  it('handles an empty request', async () => {
    const { adapter } = createAdapter([]);

    expect((await adapter.findSummaries([])).size).toBe(0);
  });
});
