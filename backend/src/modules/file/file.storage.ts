import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

export interface StorableFile {
  readonly buffer: Buffer;
  readonly originalName: string;
  readonly mimeType: string;
}

/**
 * Storage port (Adapter, CLAUDE.md §4). Swapping local disk for S3 later means adding
 * one implementation and changing one line in the composition root.
 */
export interface IFileStorage {
  save(file: StorableFile): Promise<string>;
  read(storageKey: string): Promise<Buffer>;
}

/** Development/self-hosted implementation writing under `FILE_STORAGE_PATH`. */
export class LocalDiskFileStorage implements IFileStorage {
  private readonly root: string;

  constructor(rootPath: string) {
    this.root = resolve(rootPath);
  }

  async save(file: StorableFile): Promise<string> {
    await mkdir(this.root, { recursive: true });

    const storageKey = `${randomUUID()}${extname(file.originalName).toLowerCase()}`;
    await writeFile(this.absolutePath(storageKey), file.buffer);

    return storageKey;
  }

  // `async` so a rejected key surfaces as a rejected promise, never a synchronous throw.
  async read(storageKey: string): Promise<Buffer> {
    return readFile(this.absolutePath(storageKey));
  }

  /** Keys are generated, never client-supplied; this guards against traversal anyway. */
  private absolutePath(storageKey: string): string {
    const candidate = resolve(join(this.root, storageKey));

    if (!candidate.startsWith(this.root)) {
      throw new Error('Resolved storage path escapes the storage root');
    }

    return candidate;
  }
}
