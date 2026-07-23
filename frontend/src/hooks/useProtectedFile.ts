import { useCallback, useEffect, useRef, useState } from 'react';

import { fileApi, type IFileApi } from '@/services/file.api';

export interface ProtectedFile {
  readonly isBusy: boolean;
  readonly error: string | null;
  /** Saves the bytes to disk under `filename`. */
  readonly download: (fileId: string, filename: string) => Promise<void>;
  /** Opens the bytes in a new tab, so a PDF can be read without saving it first. */
  readonly view: (fileId: string) => Promise<void>;
}

/**
 * Reads a protected file on demand.
 *
 * A plain `<a href>` cannot carry the bearer token — the access token lives in memory,
 * not in a cookie — so the bytes come through the API client and are handed over as an
 * object URL. Fetching on click rather than on render matters here: a page of candidates
 * would otherwise pull down every résumé nobody asked for.
 *
 * URLs opened in another tab cannot be revoked immediately, because that tab is still
 * reading them; they are released when this component goes away instead.
 */
export const useProtectedFile = (api: IFileApi = fileApi): ProtectedFile => {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const openedUrls = useRef<string[]>([]);

  useEffect(
    () => () => {
      isMounted.current = false;
      for (const url of openedUrls.current) {
        URL.revokeObjectURL(url);
      }
      openedUrls.current = [];
    },
    [],
  );

  const withBytes = useCallback(
    async (fileId: string, use: (objectUrl: string) => void): Promise<void> => {
      setIsBusy(true);
      setError(null);

      try {
        const blob = await api.download(fileId);
        use(URL.createObjectURL(blob));
      } catch {
        if (isMounted.current) {
          setError('That file could not be opened.');
        }
      } finally {
        if (isMounted.current) {
          setIsBusy(false);
        }
      }
    },
    [api],
  );

  const download = useCallback(
    (fileId: string, filename: string): Promise<void> =>
      withBytes(fileId, (objectUrl) => {
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.rel = 'noreferrer noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        // The browser has the bytes by now; holding the URL open would leak it.
        URL.revokeObjectURL(objectUrl);
      }),
    [withBytes],
  );

  const view = useCallback(
    (fileId: string): Promise<void> =>
      withBytes(fileId, (objectUrl) => {
        openedUrls.current.push(objectUrl);
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      }),
    [withBytes],
  );

  return { isBusy, error, download, view };
};
