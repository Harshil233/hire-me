import { useCallback, useEffect, useRef, useState } from 'react';

import { fileApi, type IFileApi } from '@/services/file.api';

export interface FileDownload {
  readonly isDownloading: boolean;
  readonly error: string | null;
  /** Fetches the bytes and hands them to the browser under `filename`. */
  readonly download: (fileId: string, filename: string) => Promise<void>;
}

/**
 * Downloads a protected file on demand.
 *
 * A plain `<a href>` cannot carry the bearer token — the access token lives in memory,
 * not in a cookie — so the bytes come through the API client and are handed over as a
 * short-lived object URL. Fetching on click rather than on render matters here: a page
 * of candidates would otherwise pull down every résumé nobody asked for.
 */
export const useFileDownload = (api: IFileApi = fileApi): FileDownload => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  const download = useCallback(
    async (fileId: string, filename: string): Promise<void> => {
      setIsDownloading(true);
      setError(null);

      try {
        const blob = await api.download(fileId);
        const objectUrl = URL.createObjectURL(blob);

        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.rel = 'noreferrer noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        // The browser has the bytes by now; holding the URL open would leak it.
        URL.revokeObjectURL(objectUrl);
      } catch {
        if (isMounted.current) {
          setError('That file could not be downloaded.');
        }
      } finally {
        if (isMounted.current) {
          setIsDownloading(false);
        }
      }
    },
    [api],
  );

  return { isDownloading, error, download };
};
