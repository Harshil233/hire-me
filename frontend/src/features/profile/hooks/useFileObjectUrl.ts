import { useEffect, useState } from 'react';

import { profileApi, type IProfileApi } from '../api/profile.api';

/**
 * Fetches a protected file and exposes it as an object URL.
 *
 * A plain `<img src>` cannot carry the bearer token — the access token lives in memory,
 * not in a cookie — so the bytes are fetched through the API client and wrapped in a
 * blob URL, which is revoked when the component unmounts.
 */
export const useFileObjectUrl = (
  fileId: string | undefined,
  api: IProfileApi = profileApi,
): string | null => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (fileId === undefined || fileId === '') {
      setObjectUrl(null);
      return;
    }

    let isActive = true;
    let createdUrl: string | null = null;

    const load = async (): Promise<void> => {
      try {
        const blob = await api.downloadFile(fileId);
        if (!isActive) {
          return;
        }
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      } catch {
        if (isActive) {
          setObjectUrl(null);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
      if (createdUrl !== null) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [fileId, api]);

  return objectUrl;
};
