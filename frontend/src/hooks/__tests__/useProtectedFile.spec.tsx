import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IFileApi } from '@/services/file.api';
import { useProtectedFile } from '../useProtectedFile';

const createObjectURL = vi.fn(() => 'blob:resume');
const revokeObjectURL = vi.fn();
const open = vi.fn();

beforeEach(() => {
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
  vi.stubGlobal('open', open);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const Harness = ({ api }: { api: IFileApi }): React.JSX.Element => {
  const { download, view, isBusy, error } = useProtectedFile(api);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void download('file-1', 'ada-resume.pdf');
        }}
      >
        Download
      </button>
      <button
        type="button"
        onClick={() => {
          void view('file-1');
        }}
      >
        View
      </button>
      <span data-testid="state">{isBusy ? 'busy' : 'idle'}</span>
      <span data-testid="error">{error ?? ''}</span>
    </>
  );
};

const okApi = (): IFileApi => ({ download: vi.fn(async () => new Blob(['pdf'])) });

describe('useProtectedFile', () => {
  it('does not fetch anything until asked', () => {
    const api = okApi();

    render(<Harness api={api} />);

    expect(api.download).not.toHaveBeenCalled();
  });

  it('fetches the bytes when downloading', async () => {
    const user = userEvent.setup();
    const api = okApi();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<Harness api={api} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(api.download).toHaveBeenCalledWith('file-1');
    });
  });

  it('saves under the requested filename', async () => {
    const user = userEvent.setup();
    let savedAs = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      savedAs = this.download;
    });

    render(<Harness api={okApi()} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(savedAs).toBe('ada-resume.pdf');
    });
  });

  it('releases the URL after a download rather than leaking it', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<Harness api={okApi()} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:resume');
    });
  });

  it('opens the file in a new tab when viewing', async () => {
    const user = userEvent.setup();

    render(<Harness api={okApi()} />);
    await user.click(screen.getByRole('button', { name: 'View' }));

    await waitFor(() => {
      expect(open).toHaveBeenCalledWith('blob:resume', '_blank', 'noopener,noreferrer');
    });
  });

  it('keeps a viewed URL alive, because the new tab is still reading it', async () => {
    const user = userEvent.setup();

    render(<Harness api={okApi()} />);
    await user.click(screen.getByRole('button', { name: 'View' }));

    await waitFor(() => {
      expect(open).toHaveBeenCalled();
    });
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it('releases viewed URLs once the component goes away', async () => {
    const user = userEvent.setup();

    const { unmount } = render(<Harness api={okApi()} />);
    await user.click(screen.getByRole('button', { name: 'View' }));
    await waitFor(() => {
      expect(open).toHaveBeenCalled();
    });

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:resume');
  });

  it('reports a failure instead of throwing', async () => {
    const user = userEvent.setup();
    const api: IFileApi = { download: vi.fn(async () => Promise.reject(new Error('403'))) };

    render(<Harness api={api} />);
    await user.click(screen.getByRole('button', { name: 'View' }));

    expect(await screen.findByTestId('error')).toHaveTextContent(
      'That file could not be opened.',
    );
  });

  it('stops reporting itself as busy once a failure settles', async () => {
    const user = userEvent.setup();
    const api: IFileApi = { download: vi.fn(async () => Promise.reject(new Error('403'))) };

    render(<Harness api={api} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(screen.getByTestId('state')).toHaveTextContent('idle');
    });
  });

  it('clears a previous error when a later attempt succeeds', async () => {
    const user = userEvent.setup();
    const download = vi
      .fn<IFileApi['download']>()
      .mockRejectedValueOnce(new Error('403'))
      .mockResolvedValueOnce(new Blob(['pdf']));

    render(<Harness api={{ download }} />);
    await user.click(screen.getByRole('button', { name: 'View' }));
    await screen.findByText('That file could not be opened.');

    await user.click(screen.getByRole('button', { name: 'View' }));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('');
    });
  });
});
