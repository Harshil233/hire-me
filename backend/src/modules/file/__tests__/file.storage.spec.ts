import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { LocalDiskFileStorage } from '../file.storage';

let root: string;
let storage: LocalDiskFileStorage;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'hire-me-storage-'));
  storage = new LocalDiskFileStorage(root);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('LocalDiskFileStorage', () => {
  it('saves bytes under a generated key that keeps the extension', async () => {
    const key = await storage.save({
      buffer: Buffer.from('hello'),
      originalName: 'Resume.PDF',
      mimeType: 'application/pdf',
    });

    expect(key).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    await expect(readFile(join(root, key), 'utf8')).resolves.toBe('hello');
  });

  it('never reuses a key for the same file name', async () => {
    const file = { buffer: Buffer.from('x'), originalName: 'a.png', mimeType: 'image/png' };

    expect(await storage.save(file)).not.toBe(await storage.save(file));
  });

  it('reads back exactly what was written', async () => {
    const bytes = Buffer.from([0, 1, 2, 253, 254, 255]);
    const key = await storage.save({
      buffer: bytes,
      originalName: 'binary.bin',
      mimeType: 'application/octet-stream',
    });

    expect(Buffer.compare(await storage.read(key), bytes)).toBe(0);
  });

  it('creates the storage directory on demand', async () => {
    const nested = new LocalDiskFileStorage(join(root, 'deep', 'nested'));

    const key = await nested.save({
      buffer: Buffer.from('y'),
      originalName: 'b.png',
      mimeType: 'image/png',
    });

    await expect(nested.read(key)).resolves.toBeInstanceOf(Buffer);
  });

  it('refuses a key that would escape the storage root', async () => {
    await expect(storage.read('../../etc/passwd')).rejects.toThrow(/escapes the storage root/);
  });

  it('rejects reading a key that does not exist', async () => {
    await expect(storage.read('missing-key.png')).rejects.toThrow();
  });
});
