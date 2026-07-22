import type { Request, Response } from 'express';

import { requireAuth } from '../../common/middlewares/authorize.middleware';
import { HTTP_STATUS, sendSuccess } from '../../common/http/api-response';
import type { ICompanyService } from './company.interface';
import { toCompanyResponse } from './company.mapper';
import type { CompanyIdParams, CreateCompanyInput, UpdateCompanyInput } from './company.schema';

/** Translates HTTP ↔ service calls only; no business rules live here. */
export class CompanyController {
  constructor(private readonly companyService: ICompanyService) {}

  register = async (
    req: Request<Record<string, never>, unknown, CreateCompanyInput>,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    const company = await this.companyService.registerForUser(userId, req.body);
    sendSuccess(res, { company: toCompanyResponse(company) }, HTTP_STATUS.CREATED);
  };

  getById = async (req: Request<CompanyIdParams>, res: Response): Promise<void> => {
    const company = await this.companyService.getById(req.params.id);
    sendSuccess(res, { company: toCompanyResponse(company) });
  };

  update = async (
    req: Request<CompanyIdParams, unknown, UpdateCompanyInput>,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    const company = await this.companyService.update(req.params.id, userId, req.body);
    sendSuccess(res, { company: toCompanyResponse(company) });
  };
}
