import { describe, expect, it, vi } from 'vitest';

import { ROLES } from '../../../config/constants';
import { UnauthorizedError } from '../../../common/errors/app-error';
import { createMockRequest, createMockResponse } from '../../../../tests/helpers/express-mocks';
import { CompanyController } from '../company.controller';
import type { Company, ICompanyService } from '../company.interface';

const COMPANY: Company = {
  id: 'company-1',
  name: 'Acme',
  slug: 'acme',
  locations: ['Pune'],
  createdByUserId: 'user-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const createService = (): ICompanyService => ({
  create: vi.fn(async () => COMPANY),
  registerForUser: vi.fn(async () => COMPANY),
  getById: vi.fn(async () => COMPANY),
  update: vi.fn(async () => COMPANY),
});

const AUTH = { userId: 'user-1', role: ROLES.HR };

describe('CompanyController', () => {
  it('registers a company for the caller and answers 201', async () => {
    const service = createService();
    const res = createMockResponse();

    await new CompanyController(service).register(
      createMockRequest({ auth: AUTH, body: { name: 'Acme', locations: [] } }),
      res,
    );

    expect(service.registerForUser).toHaveBeenCalledWith('user-1', {
      name: 'Acme',
      locations: [],
    });
    expect(res.capturedStatus).toBe(201);
  });

  it('serialises dates as ISO strings', async () => {
    const res = createMockResponse();

    await new CompanyController(createService()).getById(
      createMockRequest({ auth: AUTH, params: { id: 'company-1' } }),
      res,
    );

    expect(res.capturedBody).toEqual({
      success: true,
      data: {
        company: expect.objectContaining({
          id: 'company-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        }) as unknown,
      },
    });
  });

  it('passes the actor through when updating', async () => {
    const service = createService();

    await new CompanyController(service).update(
      createMockRequest({ auth: AUTH, params: { id: 'company-1' }, body: { name: 'Acme Ltd' } }),
      createMockResponse(),
    );

    expect(service.update).toHaveBeenCalledWith('company-1', 'user-1', { name: 'Acme Ltd' });
  });

  it('refuses without an authenticated identity', async () => {
    await expect(
      new CompanyController(createService()).register(
        createMockRequest({ body: {} }),
        createMockResponse(),
      ),
    ).rejects.toThrow(UnauthorizedError);
  });
});
