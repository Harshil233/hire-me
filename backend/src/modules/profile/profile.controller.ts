import type { Request, Response } from 'express';

import { requireAuth } from '../../common/middlewares/authorize.middleware';
import { sendSuccess } from '../../common/http/api-response';
import type { IProfileService } from './profile.interface';

export class ProfileController {
  constructor(private readonly profileService: IProfileService) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const { userId, role } = requireAuth(req);
    const view = await this.profileService.getProfile(userId, role);
    sendSuccess(res, view);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { userId, role } = requireAuth(req);
    const view = await this.profileService.updateProfile(userId, role, req.body);
    sendSuccess(res, view);
  };
}
