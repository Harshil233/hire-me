import type { Request, Response } from 'express';

import { requireAuth } from '../../common/middlewares/authorize.middleware';
import { validatedQuery } from '../../common/middlewares/validate.middleware';
import { HTTP_STATUS, sendSuccess } from '../../common/http/api-response';
import type { JobIdParams } from '../job/job.schema';
import type { IApplicationService } from './application.interface';
import { toApplicantResponse, toMyApplicationResponse } from './application.mapper';
import type {
  ApplicationIdParams,
  ApplicationStatusInput,
  ApplyInput,
  JobApplicantQueryInput,
  MyApplicationQueryInput,
} from './application.schema';

/** Translates HTTP ↔ service calls only; no business rules live here. */
export class ApplicationController {
  constructor(private readonly applicationService: IApplicationService) {}

  apply = async (req: Request<JobIdParams, unknown, ApplyInput>, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    const application = await this.applicationService.apply(req.params.id, userId, req.body);

    sendSuccess(
      res,
      { application: toMyApplicationResponse(application) },
      HTTP_STATUS.CREATED,
    );
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    const query = validatedQuery<MyApplicationQueryInput>(req);
    const result = await this.applicationService.listMine(userId, query);

    sendSuccess(res, {
      applications: result.applications.map((application) =>
        toMyApplicationResponse(application),
      ),
      pagination: result.pagination,
    });
  };

  listMineJobIds = async (req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    sendSuccess(res, { jobIds: await this.applicationService.listAppliedJobIds(userId) });
  };

  listForJob = async (req: Request<JobIdParams>, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    const query = validatedQuery<JobApplicantQueryInput>(req);
    const result = await this.applicationService.listForJob(req.params.id, userId, query);

    sendSuccess(res, {
      applications: result.applications.map((application) => toApplicantResponse(application)),
      pagination: result.pagination,
    });
  };

  changeStatus = async (
    req: Request<ApplicationIdParams, unknown, ApplicationStatusInput>,
    res: Response,
  ): Promise<void> => {
    // The role comes from the verified access token, never from the request body.
    const { userId, role } = requireAuth(req);
    const application = await this.applicationService.changeStatus(
      req.params.id,
      userId,
      role,
      req.body.status,
    );

    sendSuccess(res, { application: { id: application.id, status: application.status } });
  };
}
