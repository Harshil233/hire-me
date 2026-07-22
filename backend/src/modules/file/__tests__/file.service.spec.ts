import { describe, expect, it, vi } from 'vitest';

import { FILE_KINDS } from '../../../config/constants';
import { ERROR_CODES } from '../../../common/errors/error-codes';
import type { IFileRepository, StoredFileRecord } from '../file.interface';
import { FileService } from '../file.service';
import type { IFileStorage } from '../file.storage';

const RECORD: StoredFileRecord = {
  id: 'file-1',
  ownerUserId: 'user-1',
  kind: FILE_KINDS.PROFILE_PIC,
  storageKey: 'stored-key.png',
  originalName: 'me.png',
  mimeType: 'image/png',
  sizeBytes: 1024,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const createHarness = (): {
  service: FileService;
  repository: IFileRepository;
  storage: IFileStorage;
} => {
  const repository: IFileRepository = {
    create: vi.fn(async () => RECORD),
    findByIdForOwner: vi.fn(async () => RECORD),
  };

  const storage: IFileStorage = {
    save: vi.fn(async () => 'stored-key.png'),
    read: vi.fn(async () => Buffer.from('file-bytes')),
  };

  return { service: new FileService(repository, storage), repository, storage };
};

const UPLOAD = {
  kind: FILE_KINDS.PROFILE_PIC,
  buffer: Buffer.from('bytes'),
  originalName: 'me.png',
  mimeType: 'image/png',
  sizeBytes: 1024,
};

describe('FileService.upload', () => {
  it('stores the bytes and records the metadata', async () => {
    const { service, repository, storage } = createHarness();

    await expect(service.upload('user-1', UPLOAD)).resolves.toEqual(RECORD);
    expect(storage.save).toHaveBeenCalledWith({
      buffer: UPLOAD.buffer,
      originalName: 'me.png',
      mimeType: 'image/png',
    });
    expect(repository.create).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      kind: FILE_KINDS.PROFILE_PIC,
      storageKey: 'stored-key.png',
      originalName: 'me.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
    });
  });

  it('accepts a PDF résumé', async () => {
    const { service } = createHarness();

    await expect(
      service.upload('user-1', {
        ...UPLOAD,
        kind: FILE_KINDS.RESUME,
        mimeType: 'application/pdf',
      }),
    ).resolves.toEqual(RECORD);
  });

  it('rejects a mime type that does not match the kind', async () => {
    const { service, storage } = createHarness();

    await expect(
      service.upload('user-1', { ...UPLOAD, kind: FILE_KINDS.RESUME, mimeType: 'image/png' }),
    ).rejects.toMatchObject({ statusCode: 422, code: ERROR_CODES.UNSUPPORTED_FILE_TYPE });
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('rejects an executable disguised as a profile picture', async () => {
    const { service } = createHarness();

    await expect(
      service.upload('user-1', { ...UPLOAD, mimeType: 'application/x-msdownload' }),
    ).rejects.toMatchObject({ code: ERROR_CODES.UNSUPPORTED_FILE_TYPE });
  });

  it('does not record metadata when storage fails', async () => {
    const { service, repository, storage } = createHarness();
    vi.mocked(storage.save).mockRejectedValue(new Error('disk full'));

    await expect(service.upload('user-1', UPLOAD)).rejects.toThrow('disk full');
    expect(repository.create).not.toHaveBeenCalled();
  });
});

describe('FileService.download', () => {
  it('returns the record and its bytes to the owner', async () => {
    const { service, storage } = createHarness();

    const result = await service.download('file-1', 'user-1');

    expect(storage.read).toHaveBeenCalledWith('stored-key.png');
    expect(result.content.toString()).toBe('file-bytes');
    expect(result.record).toEqual(RECORD);
  });

  it('reports another user’s file as not found', async () => {
    const { service, repository } = createHarness();
    vi.mocked(repository.findByIdForOwner).mockResolvedValue(null);

    await expect(service.download('file-1', 'intruder')).rejects.toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.FILE_NOT_FOUND,
    });
  });

  it('propagates a storage read failure', async () => {
    const { service, storage } = createHarness();
    vi.mocked(storage.read).mockRejectedValue(new Error('ENOENT'));

    await expect(service.download('file-1', 'user-1')).rejects.toThrow('ENOENT');
  });
});
