import { Router, type RequestHandler } from 'express';

import type { FileController } from './file.controller';
import { validateFileIdParam, validateUploadFile } from './file.validator';

export interface FileRoutesDependencies {
  readonly controller: FileController;
  readonly authenticate: RequestHandler;
  readonly upload: RequestHandler;
}

export const createFileRouter = ({
  controller,
  authenticate,
  upload,
}: FileRoutesDependencies): Router => {
  const router = Router();

  router.post('/', authenticate, upload, validateUploadFile, controller.upload);
  router.get('/:id', authenticate, validateFileIdParam, controller.download);

  return router;
};
