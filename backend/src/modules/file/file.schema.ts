import { z } from 'zod';

import { FILE_KIND_VALUES } from '../../config/constants';
import { objectIdSchema } from '../../common/validation/fields';

export const uploadFileBodySchema = z.object({
  kind: z.enum(FILE_KIND_VALUES),
});
export type UploadFileBody = z.infer<typeof uploadFileBodySchema>;

export const fileIdParamsSchema = z.object({ id: objectIdSchema });
export type FileIdParams = z.infer<typeof fileIdParamsSchema>;

export const fileResponseSchema = z.object({
  id: z.string(),
  kind: z.enum(FILE_KIND_VALUES),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  createdAt: z.iso.datetime(),
});
export type FileResponse = z.infer<typeof fileResponseSchema>;
