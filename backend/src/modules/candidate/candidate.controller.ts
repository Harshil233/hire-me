import type { Request, Response } from 'express';

import { validatedQuery } from '../../common/middlewares/validate.middleware';
import { sendSuccess } from '../../common/http/api-response';
import type { ICandidateDirectoryService } from './candidate.interface';
import type { CandidateQueryInput, CandidateUserIdParams } from './candidate.schema';

/** Translates HTTP ↔ service calls only; no business rules live here. */
export class CandidateController {
  constructor(private readonly directoryService: ICandidateDirectoryService) {}

  browse = async (req: Request, res: Response): Promise<void> => {
    const query = validatedQuery<CandidateQueryInput>(req);
    const result = await this.directoryService.browse(query);

    sendSuccess(res, { candidates: result.candidates, pagination: result.pagination });
  };

  detail = async (req: Request<CandidateUserIdParams>, res: Response): Promise<void> => {
    const candidate = await this.directoryService.getDetail(req.params.userId);

    sendSuccess(res, { candidate });
  };
}
