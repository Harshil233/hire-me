import { describe, expect, it, vi } from 'vitest';

import { FILE_KINDS, ROLES } from '../../../config/constants';
import { ERROR_CODES } from '../../../common/errors/error-codes';
import { createMockRequest, createMockResponse } from '../../../../tests/helpers/express-mocks';
import { FileController } from '../file.controller';
import type { IFileService, StoredFileRecord } from '../file.interface';

const RECORD: StoredFileRecord = {
  id: 'file-1',
  ownerUserId: 'user-1',
  kind: FILE_KINDS.RESUME,
  storageKey: 'key.pdf',
  originalName: 'my résumé.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const AUTH = { userId: 'user-1', role: ROLES.CANDIDATE };

const createService = (): IFileService => ({
  upload: vi.fn(async () => RECORD),
  download: vi.fn(async () => ({ record: RECORD, content: Buffer.from('pdf-bytes') })),
});

const uploadedFile = {
  buffer: Buffer.from('pdf-bytes'),
  originalname: 'my résumé.pdf',
  mimetype: 'application/pdf',
  size: 2048,
} as Express.Multer.File;

describe('FileController.upload', () => {
  it('answers 201 with the file metadata but never the bytes', async () => {
    const service = createService();
    const res = createMockResponse();

    await new FileController(service).upload(
      createMockRequest({ auth: AUTH, body: { kind: FILE_KINDS.RESUME }, file: uploadedFile }),
      res,
    );

    expect(service.upload).toHaveBeenCalledWith('user-1', {
      kind: FILE_KINDS.RESUME,
      buffer: uploadedFile.buffer,
      originalName: 'my résumé.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
    });
    expect(res.capturedStatus).toBe(201);
    expect(res.capturedBody).toEqual({
      success: true,
      data: {
        file: {
          id: 'file-1',
          kind: FILE_KINDS.RESUME,
          originalName: 'my résumé.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });
    expect(JSON.stringify(res.capturedBody)).not.toContain('key.pdf');
  });

  it('rejects a request with no attached file', async () => {
    await expect(
      new FileController(createService()).upload(
        createMockRequest({ auth: AUTH, body: { kind: FILE_KINDS.RESUME } }),
        createMockResponse(),
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: ERROR_CODES.FILE_REQUIRED });
  });
});

describe('FileController.download', () => {
  it('streams the file with its content headers', async () => {
    const service = createService();
    const res = createMockResponse();

    await new FileController(service).download(
      createMockRequest({ auth: AUTH, params: { id: 'file-1' } }),
      res,
    );

    expect(service.download).toHaveBeenCalledWith('file-1', 'user-1');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', 2048);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent('my résumé.pdf')}"`,
    );
    expect((res.capturedBody as Buffer).toString()).toBe('pdf-bytes');
  });

  it('propagates a not-found from the service', async () => {
    const service = createService();
    vi.mocked(service.download).mockRejectedValue(
      Object.assign(new Error('File not found'), { statusCode: 404 }),
    );

    await expect(
      new FileController(service).download(
        createMockRequest({ auth: AUTH, params: { id: 'file-9' } }),
        createMockResponse(),
      ),
    ).rejects.toThrow('File not found');
  });
});
