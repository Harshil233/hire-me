import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IFileApi } from '@/services/file.api';
import { ResumeButton } from '../components/ResumeButton';

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => 'blob:resume',
    revokeObjectURL: () => undefined,
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ResumeButton', () => {
  it('names the saved file after the candidate', async () => {
    const user = userEvent.setup();
    const api: IFileApi = { download: vi.fn(async () => new Blob(['pdf'])) };
    let savedAs = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      savedAs = this.download;
    });

    render(<ResumeButton fileId="file-1" candidateName="Ada Lovelace" api={api} />);
    await user.click(screen.getByRole('button', { name: /Résumé/ }));

    await waitFor(() => {
      expect(savedAs).toBe('ada-lovelace-resume.pdf');
    });
  });

  it('reports a résumé that will not download', async () => {
    const user = userEvent.setup();
    const api: IFileApi = { download: vi.fn(async () => Promise.reject(new Error('404'))) };

    render(<ResumeButton fileId="file-1" candidateName="Ada Lovelace" api={api} />);
    await user.click(screen.getByRole('button', { name: /Résumé/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That file could not be downloaded.',
    );
  });

  it('shows no error before anything has been tried', () => {
    const api: IFileApi = { download: vi.fn(async () => new Blob(['pdf'])) };

    render(<ResumeButton fileId="file-1" candidateName="Ada Lovelace" api={api} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
