import multer, { memoryStorage } from 'multer';
import type { RequestHandler } from 'express';

/** Field name every upload must use. */
export const UPLOAD_FIELD_NAME = 'file';

/**
 * Buffers a single upload in memory so the storage adapter — not Express — decides
 * where the bytes end up. Size is capped by `MAX_UPLOAD_BYTES`; multer's
 * `LIMIT_FILE_SIZE` is translated to a 413 by the error middleware.
 */
export const createUploadMiddleware = (maxBytes: number): RequestHandler =>
  multer({
    storage: memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
  }).single(UPLOAD_FIELD_NAME);
