import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../../../common/errors/app-error';
import { CandidateDirectoryService } from '../candidate.directory.service';
import type {
  CandidateProfile,
  CandidateSectionReaders,
  ICandidateProfileRepository,
} from '../candidate.interface';
import type { Certification } from '../../certification/certification.interface';
import type { Education } from '../../education/education.interface';
import type { Experience } from '../../experience/experience.interface';
import type { Project } from '../../project/project.interface';

const NOW = new Date('2026-03-01T10:00:00.000Z');

const PROFILE: CandidateProfile = {
  id: 'profile-1',
  userId: 'candidate-1',
  isOpenToOutreach: true,
  firstName: 'Ada',
  middleName: 'B',
  lastName: 'Lovelace',
  currentLocation: 'Pune',
  preferredLocations: ['Pune', 'Remote'],
  skills: ['TypeScript'],
  jobTypes: ['full_time'],
  profilePicFileId: 'file-1',
  resumeFileId: 'resume-1',
  // Must never reach an employer, exactly as on the browse card.
  dob: new Date('1990-01-01T00:00:00.000Z'),
  mobile: { countryCode: '+91', number: '9876543210' },
  currentCtc: 1_600_000,
  expectedCtc: 2_400_000,
  createdAt: NOW,
  updatedAt: NOW,
};

const EXPERIENCE: Experience = {
  id: 'exp-1',
  userId: 'candidate-1',
  title: 'Senior Engineer',
  companyName: 'Nimbus Labs',
  startDate: NOW,
  isCurrent: true,
  skills: ['TypeScript'],
  createdAt: NOW,
  updatedAt: NOW,
};

const EDUCATION: Education = {
  id: 'edu-1',
  userId: 'candidate-1',
  college: 'COEP',
  course: 'Computer Engineering',
  degree: 'B.Tech',
  startDate: NOW,
  isCurrent: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const PROJECT: Project = {
  id: 'proj-1',
  userId: 'candidate-1',
  title: 'Static analyser',
  skills: ['Rust'],
  startDate: NOW,
  isCurrent: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const CERTIFICATION: Certification = {
  id: 'cert-1',
  userId: 'candidate-1',
  title: 'CKA',
  issuedBy: 'CNCF',
  issuedOn: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

interface Harness {
  readonly service: CandidateDirectoryService;
  readonly repository: ICandidateProfileRepository;
  readonly sections: CandidateSectionReaders;
}

const createHarness = (): Harness => {
  const repository: ICandidateProfileRepository = {
    findByUserId: vi.fn(async () => PROFILE),
    findManyByUserIds: vi.fn(async () => [PROFILE]),
    search: vi.fn(async () => ({ items: [PROFILE], total: 1 })),
    create: vi.fn(async () => PROFILE),
    update: vi.fn(async () => PROFILE),
  };

  const sections: CandidateSectionReaders = {
    experience: { list: vi.fn(async () => [EXPERIENCE]) },
    education: { list: vi.fn(async () => [EDUCATION]) },
    project: { list: vi.fn(async () => [PROJECT]) },
    certification: { list: vi.fn(async () => [CERTIFICATION]) },
  };

  return { service: new CandidateDirectoryService(repository, sections), repository, sections };
};

describe('CandidateDirectoryService.getDetail', () => {
  it('returns the candidate with every section attached', async () => {
    const { service } = createHarness();

    const detail = await service.getDetail('candidate-1');

    expect(detail.fullName).toBe('Ada B Lovelace');
    expect(detail.experience).toEqual([EXPERIENCE]);
    expect(detail.education).toEqual([EDUCATION]);
    expect(detail.projects).toEqual([PROJECT]);
    expect(detail.certifications).toEqual([CERTIFICATION]);
  });

  it('keeps the resume id, which is what makes the download possible', async () => {
    const { service } = createHarness();

    expect((await service.getDetail('candidate-1')).resumeFileId).toBe('resume-1');
  });

  it.each([['dob'], ['mobile'], ['currentCtc'], ['expectedCtc'], ['firstName']])(
    'never discloses %s to an employer',
    async (field) => {
      const { service } = createHarness();

      expect(await service.getDetail('candidate-1')).not.toHaveProperty(field);
    },
  );

  it('reads every section for the candidate being viewed, not the viewer', async () => {
    const { service, sections } = createHarness();

    await service.getDetail('candidate-1');

    expect(sections.experience.list).toHaveBeenCalledWith('candidate-1');
    expect(sections.education.list).toHaveBeenCalledWith('candidate-1');
    expect(sections.project.list).toHaveBeenCalledWith('candidate-1');
    expect(sections.certification.list).toHaveBeenCalledWith('candidate-1');
  });

  it('reports an unknown candidate as not found', async () => {
    const { service, repository } = createHarness();
    vi.mocked(repository.findByUserId).mockResolvedValue(null);

    await expect(service.getDetail('nobody')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('does not read any section once the candidate is missing', async () => {
    const { service, repository, sections } = createHarness();
    vi.mocked(repository.findByUserId).mockResolvedValue(null);

    await expect(service.getDetail('nobody')).rejects.toBeInstanceOf(NotFoundError);
    expect(sections.experience.list).not.toHaveBeenCalled();
  });

  it('renders a candidate who has filled nothing in', async () => {
    const { service, sections } = createHarness();
    vi.mocked(sections.experience.list).mockResolvedValue([]);
    vi.mocked(sections.education.list).mockResolvedValue([]);
    vi.mocked(sections.project.list).mockResolvedValue([]);
    vi.mocked(sections.certification.list).mockResolvedValue([]);

    const detail = await service.getDetail('candidate-1');

    expect(detail.experience).toEqual([]);
    expect(detail.certifications).toEqual([]);
  });
});
