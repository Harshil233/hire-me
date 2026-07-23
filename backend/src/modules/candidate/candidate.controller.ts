import type { Request, Response } from 'express';

import { validatedQuery } from '../../common/middlewares/validate.middleware';
import { sendSuccess } from '../../common/http/api-response';
import type { ICandidateProfileService } from './candidate.interface';
import type { CandidateQueryInput } from './candidate.schema';

/** Translates HTTP ↔ service calls only; no business rules live here. */
export class CandidateController {
  constructor(private readonly candidateService: ICandidateProfileService) {}

  browse = async (req: Request, res: Response): Promise<void> => {
    const query = validatedQuery<CandidateQueryInput>(req);
    const result = await this.candidateService.browse(query);

    sendSuccess(res, { candidates: result.candidates, pagination: result.pagination });
  };
}
