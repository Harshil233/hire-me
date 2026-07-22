import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPANY_ROLES } from '../../../config/constants';
import { ERROR_CODES } from '../../../common/errors/error-codes';
import type {
  ITransactionManager,
  TransactionContext,
} from '../../../common/persistence/transaction.types';
import { CompanyService } from '../company.service';
import type { Company, ICompanyMembership, ICompanyRepository } from '../company.interface';

const CONTEXT: TransactionContext = { transactionId: 'txn-1' };

const COMPANY: Company = {
  id: 'company-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  locations: [],
  createdByUserId: 'user-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

interface Harness {
  readonly service: CompanyService;
  readonly repository: ICompanyRepository;
  readonly membership: ICompanyMembership;
  readonly transactionManager: ITransactionManager;
}

const createHarness = (): Harness => {
  const repository: ICompanyRepository = {
    findById: vi.fn(async () => COMPANY),
    findManyByIds: vi.fn(async () => [COMPANY]),
    existsBySlug: vi.fn(async () => false),
    existsByDomain: vi.fn(async () => false),
    create: vi.fn(async () => COMPANY),
    update: vi.fn(async () => COMPANY),
  };

  const membership: ICompanyMembership = {
    findCompanyIdForUser: vi.fn(async () => null),
    attachCompany: vi.fn(async () => undefined),
    canManageCompany: vi.fn(async () => true),
  };

  const transactionManager: ITransactionManager = {
    runInTransaction: vi.fn(async (work) => work(CONTEXT)),
  };

  return {
    service: new CompanyService(repository, membership, transactionManager),
    repository,
    membership,
    transactionManager,
  };
};

describe('CompanyService.create', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('derives a slug from the name', async () => {
    await harness.service.create({ name: 'Acme Corp', locations: [] }, 'user-1');

    expect(harness.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'acme-corp', createdByUserId: 'user-1' }),
      undefined,
    );
  });

  it('appends a counter until the slug is free', async () => {
    vi.mocked(harness.repository.existsBySlug)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await harness.service.create({ name: 'Acme Corp', locations: [] }, 'user-1');

    expect(harness.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'acme-corp-3' }),
      undefined,
    );
  });

  it('falls back when the name has no slug-able characters', async () => {
    await harness.service.create({ name: '###', locations: [] }, 'user-1');

    expect(harness.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'company' }),
      undefined,
    );
  });

  it('gives up rather than looping forever on slug collisions', async () => {
    vi.mocked(harness.repository.existsBySlug).mockResolvedValue(true);

    await expect(
      harness.service.create({ name: 'Acme', locations: [] }, 'user-1'),
    ).rejects.toMatchObject({ code: ERROR_CODES.COMPANY_ALREADY_EXISTS });
  });

  it('rejects a domain that is already registered', async () => {
    vi.mocked(harness.repository.existsByDomain).mockResolvedValue(true);

    await expect(
      harness.service.create({ name: 'Acme', locations: [], domain: 'acme.com' }, 'user-1'),
    ).rejects.toMatchObject({ statusCode: 409, code: ERROR_CODES.COMPANY_ALREADY_EXISTS });
    expect(harness.repository.create).not.toHaveBeenCalled();
  });

  it('joins the caller’s transaction when one is supplied', async () => {
    await harness.service.create({ name: 'Acme', locations: [] }, 'user-1', CONTEXT);

    expect(harness.repository.create).toHaveBeenCalledWith(expect.anything(), CONTEXT);
  });
});

describe('CompanyService.registerForUser', () => {
  it('creates the company and links the HR as owner in one transaction', async () => {
    const harness = createHarness();

    await harness.service.registerForUser('user-1', { name: 'Acme', locations: [] });

    expect(harness.transactionManager.runInTransaction).toHaveBeenCalledOnce();
    expect(harness.membership.attachCompany).toHaveBeenCalledWith(
      'user-1',
      'company-1',
      COMPANY_ROLES.OWNER,
      CONTEXT,
    );
  });

  it('refuses when the account is already linked to a company', async () => {
    const harness = createHarness();
    vi.mocked(harness.membership.findCompanyIdForUser).mockResolvedValue('company-9');

    await expect(
      harness.service.registerForUser('user-1', { name: 'Acme', locations: [] }),
    ).rejects.toMatchObject({ statusCode: 409, code: ERROR_CODES.COMPANY_ALREADY_LINKED });
    expect(harness.transactionManager.runInTransaction).not.toHaveBeenCalled();
  });
});

describe('CompanyService.getById', () => {
  it('returns the company', async () => {
    await expect(createHarness().service.getById('company-1')).resolves.toEqual(COMPANY);
  });

  it('throws a 404 when it does not exist', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.findById).mockResolvedValue(null);

    await expect(harness.service.getById('missing')).rejects.toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.COMPANY_NOT_FOUND,
    });
  });
});

describe('CompanyService.update', () => {
  it('updates when the caller owns the company', async () => {
    const harness = createHarness();

    await expect(
      harness.service.update('company-1', 'user-1', { name: 'Acme Ltd' }),
    ).resolves.toEqual(COMPANY);
    expect(harness.repository.update).toHaveBeenCalledWith('company-1', { name: 'Acme Ltd' });
  });

  it('refuses a caller who does not manage the company', async () => {
    const harness = createHarness();
    vi.mocked(harness.membership.canManageCompany).mockResolvedValue(false);

    await expect(
      harness.service.update('company-1', 'intruder', { name: 'Hijacked' }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(harness.repository.update).not.toHaveBeenCalled();
  });

  it('rejects moving to a domain owned by another company', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.existsByDomain).mockResolvedValue(true);

    await expect(
      harness.service.update('company-1', 'user-1', { domain: 'taken.com' }),
    ).rejects.toMatchObject({ code: ERROR_CODES.COMPANY_ALREADY_EXISTS });
  });

  it('allows re-submitting the company’s current domain', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.findById).mockResolvedValue({ ...COMPANY, domain: 'acme.com' });
    vi.mocked(harness.repository.existsByDomain).mockResolvedValue(true);

    await expect(
      harness.service.update('company-1', 'user-1', { domain: 'acme.com' }),
    ).resolves.toEqual(COMPANY);
  });

  it('throws a 404 when the record vanished between read and write', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.update).mockResolvedValue(null);

    await expect(
      harness.service.update('company-1', 'user-1', { name: 'Acme Ltd' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
