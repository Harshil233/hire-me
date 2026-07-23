import { describe, expect, it, vi } from 'vitest';

import { FILE_KINDS, ROLES } from '../../../config/constants';
import { ERROR_CODES } from '../../../common/errors/error-codes';
import {
  EmployerCandidateFileAccessPolicy,
  OwnerFileAccessPolicy,
} from '../file.access-policy';
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
    findById: vi.fn(async () => RECORD),
  };

  const storage: IFileStorage = {
    save: vi.fn(async () => 'stored-key.png'),
    read: vi.fn(async () => Buffer.from('file-bytes')),
  };

  // The real policy set, so these tests exercise the wiring the app actually ships.
  const service = new FileService(repository, storage, [
    new OwnerFileAccessPolicy(),
    new EmployerCandidateFileAccessPolicy(),
  ]);

  return { service, repository, storage };
};

const OWNER = { userId: 'user-1', role: ROLES.CANDIDATE };
const EMPLOYER = { userId: 'hr-1', role: ROLES.HR };
const STRANGER = { userId: 'intruder', role: ROLES.CANDIDATE };

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

  it('accepts a PDF resume', async () => {
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

    const result = await service.download('file-1', OWNER);

    expect(storage.read).toHaveBeenCalledWith('stored-key.png');
    expect(result.content.toString()).toBe('file-bytes');
    expect(result.record).toEqual(RECORD);
  });

  it('reports a missing record as not found', async () => {
    const { service, repository } = createHarness();
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(service.download('file-1', OWNER)).rejects.toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.FILE_NOT_FOUND,
    });
  });

  it('reports another candidate’s file as not found rather than forbidden', async () => {
    const { service, storage } = createHarness();

    await expect(service.download('file-1', STRANGER)).rejects.toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.FILE_NOT_FOUND,
    });
    // Never touched the disk for a file the caller may not see.
    expect(storage.read).not.toHaveBeenCalled();
  });

  it.each([[FILE_KINDS.RESUME], [FILE_KINDS.PROFILE_PIC]])(
    'lets an employer open a candidate’s %s, both of which the talent pool shows',
    async (kind) => {
      const { service, repository } = createHarness();
      vi.mocked(repository.findById).mockResolvedValue({ ...RECORD, kind });

      await expect(service.download('file-1', EMPLOYER)).resolves.toMatchObject({
        record: { kind },
      });
    },
  );

  it('does not widen an employer to a company logo they do not own', async () => {
    const { service, repository } = createHarness();
    vi.mocked(repository.findById).mockResolvedValue({
      ...RECORD,
      kind: FILE_KINDS.COMPANY_LOGO,
    });

    await expect(service.download('file-1', EMPLOYER)).rejects.toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.FILE_NOT_FOUND,
    });
  });

  it('does not let one candidate open another candidate’s resume', async () => {
    const { service, repository } = createHarness();
    vi.mocked(repository.findById).mockResolvedValue({ ...RECORD, kind: FILE_KINDS.RESUME });

    await expect(service.download('file-1', STRANGER)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('still serves an employer their own upload of any kind', async () => {
    const { service, repository } = createHarness();
    vi.mocked(repository.findById).mockResolvedValue({
      ...RECORD,
      ownerUserId: EMPLOYER.userId,
      kind: FILE_KINDS.COMPANY_LOGO,
    });

    await expect(service.download('file-1', EMPLOYER)).resolves.toMatchObject({
      record: { ownerUserId: EMPLOYER.userId },
    });
  });

  it('propagates a storage read failure', async () => {
    const { service, storage } = createHarness();
    vi.mocked(storage.read).mockRejectedValue(new Error('ENOENT'));

    await expect(service.download('file-1', OWNER)).rejects.toThrow('ENOENT');
  });
});
