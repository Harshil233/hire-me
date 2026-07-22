import type { RequestHandler } from 'express';

import { validateRequest } from '../../common/middlewares/validate.middleware';
import { fileIdParamsSchema, uploadFileBodySchema } from './file.schema';

/** Runs after multer, so `kind` is already parsed out of the multipart body. */
export const validateUploadFile: RequestHandler = validateRequest({
  body: uploadFileBodySchema,
});

export const validateFileIdParam: RequestHandler = validateRequest({
  params: fileIdParamsSchema,
});
