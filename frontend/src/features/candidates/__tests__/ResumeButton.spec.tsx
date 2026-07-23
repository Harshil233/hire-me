import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IFileApi } from '@/services/file.api';
import { ResumeButton } from '../components/ResumeButton';

const open = vi.fn();

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => 'blob:resume',
    revokeObjectURL: () => undefined,
  });
  vi.stubGlobal('open', open);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const okApi = (): IFileApi => ({ download: vi.fn(async () => new Blob(['pdf'])) });

const renderButton = (api: IFileApi): void => {
  render(<ResumeButton fileId="file-1" candidateName="Ada Lovelace" api={api} />);
};

describe('ResumeButton', () => {
  it('offers reading the résumé and keeping it', () => {
    renderButton(okApi());

    expect(screen.getByRole('button', { name: 'View résumé' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Download Ada Lovelace’s résumé' }),
    ).toBeInTheDocument();
  });

  it('opens the résumé in a new tab when viewed', async () => {
    const user = userEvent.setup();

    renderButton(okApi());
    await user.click(screen.getByRole('button', { name: 'View résumé' }));

    await waitFor(() => {
      expect(open).toHaveBeenCalledWith('blob:resume', '_blank', 'noopener,noreferrer');
    });
  });

  it('names the saved file after the candidate', async () => {
    const user = userEvent.setup();
    let savedAs = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      savedAs = this.download;
    });

    renderButton(okApi());
    await user.click(screen.getByRole('button', { name: 'Download Ada Lovelace’s résumé' }));

    await waitFor(() => {
      expect(savedAs).toBe('ada-lovelace-resume.pdf');
    });
  });

  it('fetches nothing until one of them is pressed', () => {
    const api = okApi();

    renderButton(api);

    expect(api.download).not.toHaveBeenCalled();
  });

  it('reports a résumé that will not open', async () => {
    const user = userEvent.setup();
    const api: IFileApi = { download: vi.fn(async () => Promise.reject(new Error('404'))) };

    renderButton(api);
    await user.click(screen.getByRole('button', { name: 'View résumé' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That file could not be opened.');
  });

  it('shows no error before anything has been tried', () => {
    renderButton(okApi());

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
