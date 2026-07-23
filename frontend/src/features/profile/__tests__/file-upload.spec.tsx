import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';

import { FILE_KINDS, MAX_UPLOAD_BYTES } from '@/config/constants';
import { httpClient } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import { candidateProfileView, candidateUser } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import { ProfilePage } from '@/pages/ProfilePage';
import { FileUploadButton } from '../components/FileUploadButton';
import { useFileObjectUrl } from '../hooks/useFileObjectUrl';
import type { IProfileApi } from '../api/profile.api';

let mock: MockAdapter;

const pngFile = (name = 'me.png', size = 1024): File => {
  const file = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

beforeEach(() => {
  mock = new MockAdapter(httpClient);
  mock.onGet(/\/(experience|education|project|certification)$/).reply(200, {
    success: true,
    data: { experiences: [], educations: [], projects: [], certifications: [] },
  });
  useAuthStore.getState().setSession(candidateUser, 'token-1');
});

afterEach(() => {
  mock.restore();
  useAuthStore.setState({ accessToken: null, user: null, status: 'unknown' });
});

describe('FileUploadButton', () => {
  it('passes an accepted file to its handler', async () => {
    const onSelect = vi.fn();
    render(
      <FileUploadButton
        kind={FILE_KINDS.PROFILE_PIC}
        label="Add photo"
        isUploading={false}
        onSelect={onSelect}
      />,
    );

    await userEvent.upload(screen.getByLabelText('Add photo'), pngFile());

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('rejects an oversized file before any request is made', async () => {
    const onSelect = vi.fn();
    render(
      <FileUploadButton
        kind={FILE_KINDS.PROFILE_PIC}
        label="Add photo"
        isUploading={false}
        onSelect={onSelect}
      />,
    );

    await userEvent.upload(
      screen.getByLabelText('Add photo'),
      pngFile('huge.png', MAX_UPLOAD_BYTES + 1),
    );

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/Choose a file smaller than 5MB/)).toBeInTheDocument();
  });

  it('restricts the picker to the kind’s mime types', () => {
    render(
      <FileUploadButton
        kind={FILE_KINDS.RESUME}
        label="Upload resume"
        isUploading={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Upload resume')).toHaveAttribute(
      'accept',
      expect.stringContaining('application/pdf') as unknown as string,
    );
  });

  it('opens the picker when the button is clicked', async () => {
    render(
      <FileUploadButton
        kind={FILE_KINDS.PROFILE_PIC}
        label="Add photo"
        isUploading={false}
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('Add photo');
    const clickSpy = vi.spyOn(input, 'click');

    await userEvent.click(screen.getByRole('button', { name: 'Add photo' }));

    expect(clickSpy).toHaveBeenCalled();
  });
});

describe('useFileObjectUrl', () => {
  const Probe = ({ fileId, api }: { fileId?: string; api: IProfileApi }): React.JSX.Element => {
    const url = useFileObjectUrl(fileId, api);
    return <span data-testid="url">{url ?? 'none'}</span>;
  };

  const createApi = (overrides: Partial<IProfileApi> = {}): IProfileApi =>
    ({
      getProfile: vi.fn(),
      updateProfile: vi.fn(),
      updateCompany: vi.fn(),
      uploadFile: vi.fn(),
      downloadFile: vi.fn(async () => new Blob(['bytes'])),
      ...overrides,
    }) as IProfileApi;

  it('returns nothing when there is no file', () => {
    render(<Probe api={createApi()} />);

    expect(screen.getByTestId('url')).toHaveTextContent('none');
  });

  it('fetches the file and exposes an object URL', async () => {
    const api = createApi();

    render(<Probe fileId="file-1" api={api} />);

    await waitFor(() => {
      expect(screen.getByTestId('url').textContent).toMatch(/^blob:/);
    });
    expect(api.downloadFile).toHaveBeenCalledWith('file-1');
  });

  it('degrades to nothing when the download fails', async () => {
    const api = createApi({
      downloadFile: vi.fn(async () => {
        throw new Error('gone');
      }),
    });

    render(<Probe fileId="file-1" api={api} />);

    await waitFor(() => {
      expect(api.downloadFile).toHaveBeenCalled();
    });
    expect(screen.getByTestId('url')).toHaveTextContent('none');
  });

  it('revokes the object URL on unmount', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const { unmount } = render(<Probe fileId="file-1" api={createApi()} />);

    await waitFor(() => {
      expect(screen.getByTestId('url').textContent).toMatch(/^blob:/);
    });
    unmount();

    expect(revoke).toHaveBeenCalled();
    revoke.mockRestore();
  });
});

describe('profile photo upload', () => {
  beforeEach(() => {
    mock.onGet('/profile').reply(200, { success: true, data: candidateProfileView });
  });

  it('uploads the photo, then links it to the profile', async () => {
    mock.onPost('/files').reply(201, {
      success: true,
      data: {
        file: {
          id: 'file-9',
          kind: 'profile_pic',
          originalName: 'me.png',
          mimeType: 'image/png',
          sizeBytes: 1024,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });
    mock.onPut('/profile').reply(200, {
      success: true,
      data: {
        ...candidateProfileView,
        profile: { ...candidateProfileView.profile, profilePicFileId: 'file-9' },
      },
    });
    mock.onGet('/files/file-9').reply(200, new Blob(['image']));

    renderWithProviders(<ProfilePage />);

    await userEvent.upload(await screen.findByLabelText('Add photo'), pngFile());

    await waitFor(() => {
      expect(mock.history.put).toHaveLength(1);
    });
    expect(JSON.parse(mock.history.put[0]?.data as string)).toEqual({
      profilePicFileId: 'file-9',
    });
  });

  it('reports a rejected upload without changing the profile', async () => {
    mock.onPost('/files').reply(422, {
      success: false,
      error: {
        code: 'UNSUPPORTED_FILE_TYPE',
        message: 'A profile pic must be one of: image/png, image/jpeg, image/webp',
        details: [],
      },
    });

    renderWithProviders(<ProfilePage />);

    await userEvent.upload(await screen.findByLabelText('Add photo'), pngFile());

    expect(await screen.findByRole('alert')).toHaveTextContent('A profile pic must be one of');
    expect(mock.history.put).toHaveLength(0);
  });
});

describe('resume upload', () => {
  it('uploads a resume and links it, then offers to view it', async () => {
    mock.onGet('/profile').reply(200, {
      success: true,
      data: {
        ...candidateProfileView,
        profile: { ...candidateProfileView.profile, resumeFileId: 'file-7' },
      },
    });
    mock.onGet('/files/file-7').reply(200, new Blob(['pdf']));

    renderWithProviders(<ProfilePage />);

    expect(await screen.findByText('Resume attached')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();
  });

  it('sends the resume through the upload endpoint', async () => {
    mock.onGet('/profile').reply(200, { success: true, data: candidateProfileView });
    mock.onPost('/files').reply(201, {
      success: true,
      data: {
        file: {
          id: 'file-7',
          kind: 'resume',
          originalName: 'cv.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });
    mock.onPut('/profile').reply(200, { success: true, data: candidateProfileView });

    renderWithProviders(<ProfilePage />);

    const resume = new File(['pdf'], 'cv.pdf', { type: 'application/pdf' });
    await userEvent.upload(await screen.findByLabelText('Upload resume'), resume);

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(1);
    });
    expect(JSON.parse(mock.history.put[0]?.data as string)).toEqual({ resumeFileId: 'file-7' });
  });
});
