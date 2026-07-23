import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IFileApi } from '@/services/file.api';
import { useFileDownload } from '../useFileDownload';

const createObjectURL = vi.fn(() => 'blob:resume');
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const Harness = ({ api }: { api: IFileApi }): React.JSX.Element => {
  const { download, isDownloading, error } = useFileDownload(api);

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
      <span data-testid="state">{isDownloading ? 'busy' : 'idle'}</span>
      <span data-testid="error">{error ?? ''}</span>
    </>
  );
};

const okApi = (): IFileApi => ({ download: vi.fn(async () => new Blob(['pdf'])) });

describe('useFileDownload', () => {
  it('does not fetch anything until asked', () => {
    const api = okApi();

    render(<Harness api={api} />);

    expect(api.download).not.toHaveBeenCalled();
  });

  it('fetches the file when the button is pressed', async () => {
    const user = userEvent.setup();
    const api = okApi();

    render(<Harness api={api} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(api.download).toHaveBeenCalledWith('file-1');
    });
  });

  it('hands the bytes to the browser under the requested filename', async () => {
    const user = userEvent.setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<Harness api={okApi()} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(click).toHaveBeenCalled();
    });
    expect(createObjectURL).toHaveBeenCalled();
    click.mockRestore();
  });

  it('releases the object URL rather than leaking it', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<Harness api={okApi()} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:resume');
    });
  });

  it('leaves no anchor behind in the document', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<Harness api={okApi()} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(revokeObjectURL).toHaveBeenCalled();
    });
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('reports a failure instead of throwing', async () => {
    const user = userEvent.setup();
    const api: IFileApi = { download: vi.fn(async () => Promise.reject(new Error('403'))) };

    render(<Harness api={api} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));

    expect(await screen.findByTestId('error')).toHaveTextContent(
      'That file could not be downloaded.',
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

  it('clears a previous error when a later download succeeds', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const download = vi
      .fn<IFileApi['download']>()
      .mockRejectedValueOnce(new Error('403'))
      .mockResolvedValueOnce(new Blob(['pdf']));

    render(<Harness api={{ download }} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    await screen.findByText('That file could not be downloaded.');

    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('');
    });
  });
});
