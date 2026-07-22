import type { Request, Response } from 'express';

import { ValidationError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { requireAuth } from '../../common/middlewares/authorize.middleware';
import { HTTP_STATUS, sendSuccess } from '../../common/http/api-response';
import type { IFileService, StoredFileRecord } from './file.interface';
import type { FileIdParams, FileResponse, UploadFileBody } from './file.schema';

const toFileResponse = (record: StoredFileRecord): FileResponse => ({
  id: record.id,
  kind: record.kind,
  originalName: record.originalName,
  mimeType: record.mimeType,
  sizeBytes: record.sizeBytes,
  createdAt: record.createdAt.toISOString(),
});

export class FileController {
  constructor(private readonly fileService: IFileService) {}

  upload = async (
    req: Request<Record<string, never>, unknown, UploadFileBody>,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    const uploaded = req.file;

    if (uploaded === undefined) {
      throw new ValidationError(
        'A file is required',
        [{ field: 'file', message: 'Attach a file to upload' }],
        ERROR_CODES.FILE_REQUIRED,
      );
    }

    const record = await this.fileService.upload(userId, {
      kind: req.body.kind,
      buffer: uploaded.buffer,
      originalName: uploaded.originalname,
      mimeType: uploaded.mimetype,
      sizeBytes: uploaded.size,
    });

    sendSuccess(res, { file: toFileResponse(record) }, HTTP_STATUS.CREATED);
  };

  download = async (req: Request<FileIdParams>, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    const { record, content } = await this.fileService.download(req.params.id, userId);

    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Content-Length', record.sizeBytes);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(record.originalName)}"`,
    );
    res.send(content);
  };
}
