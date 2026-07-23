import type { Request, Response } from 'express';

import { requireAuth } from '../../common/middlewares/authorize.middleware';
import { validatedQuery } from '../../common/middlewares/validate.middleware';
import { HTTP_STATUS, sendSuccess } from '../../common/http/api-response';
import type { IJobService, JobListResult } from './job.interface';
import { toJobResponse } from './job.mapper';
import type {
  CreateJobInput,
  HrJobQueryInput,
  JobIdParams,
  JobQueryInput,
  JobStatusInput,
  UpdateJobInput,
} from './job.schema';

/** Translates HTTP ↔ service calls only; no business rules live here. */
export class JobController {
  constructor(private readonly jobService: IJobService) {}

  browse = async (req: Request, res: Response): Promise<void> => {
    const query = validatedQuery<JobQueryInput>(req);
    sendSuccess(res, JobController.present(await this.jobService.browse(query)));
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    const query = validatedQuery<HrJobQueryInput>(req);
    sendSuccess(res, JobController.present(await this.jobService.listForHr(userId, query)));
  };

  listSkills = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, { skills: await this.jobService.listSkills() });
  };

  getById = async (req: Request<JobIdParams>, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    const job = await this.jobService.getVisible(req.params.id, userId);
    sendSuccess(res, { job: toJobResponse(job) });
  };

  create = async (
    req: Request<Record<string, never>, unknown, CreateJobInput>,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    // The owning company comes from the poster's membership, never from the body.
    const job = await this.jobService.create(userId, req.body);
    sendSuccess(res, { job: toJobResponse(job) }, HTTP_STATUS.CREATED);
  };

  update = async (
    req: Request<JobIdParams, unknown, UpdateJobInput>,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    const job = await this.jobService.update(req.params.id, userId, req.body);
    sendSuccess(res, { job: toJobResponse(job) });
  };

  changeStatus = async (
    req: Request<JobIdParams, unknown, JobStatusInput>,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    const job = await this.jobService.changeStatus(req.params.id, userId, req.body.status);
    sendSuccess(res, { job: toJobResponse(job) });
  };

  private static present(result: JobListResult): Record<string, unknown> {
    return {
      jobs: result.jobs.map((job) => toJobResponse(job)),
      pagination: result.pagination,
    };
  }
}
