import { Link, useParams } from 'react-router-dom';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import {
  ArrowLeftIcon,
  AwardIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  MapPinIcon,
  SparkIcon,
  UsersIcon,
} from '@/components/icons';
import { JOB_TYPE_LABELS, ROUTES } from '@/config/constants';
import { CandidateAvatar } from '@/features/candidates/components/CandidateAvatar';
import { CandidateSection } from '@/features/candidates/components/CandidateSection';
import { ResumeButton } from '@/features/candidates/components/ResumeButton';
import { useCandidate } from '@/features/candidates/hooks/useCandidates';
import { certificationConfig } from '@/features/sections/configs/certification.config';
import { educationConfig } from '@/features/sections/configs/education.config';
import { experienceConfig } from '@/features/sections/configs/experience.config';
import { projectConfig } from '@/features/sections/configs/project.config';

const ICON = 'h-4 w-4';

/** The employer's view of one candidate: the card, expanded, plus their résumé. */
export const CandidateDetailPage = (): React.JSX.Element => {
  const { userId = '' } = useParams<{ userId: string }>();
  const query = useCandidate(userId);

  const backLink = (
    <Link
      to={ROUTES.CANDIDATES}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition hover:text-fg"
    >
      <ArrowLeftIcon className={ICON} />
      Back to the talent pool
    </Link>
  );

  if (query.isPending) {
    return (
      <div className="space-y-5" data-testid="candidate-loading">
        {backLink}
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="space-y-5">
        {backLink}
        <Alert tone="error">{query.error.message}</Alert>
        <EmptyState
          icon={<UsersIcon className="h-6 w-6" />}
          title="We could not open this candidate"
          description="They may have removed their profile since you last looked."
          action={
            <Link to={ROUTES.CANDIDATES}>
              <Button variant="secondary">Back to the talent pool</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const candidate = query.data;

  return (
    <div className="space-y-5">
      {backLink}

      <header className="surface-card overflow-hidden">
        <div className="h-1.5 bg-highlight" aria-hidden="true" />

        <div className="flex flex-wrap items-start gap-4 p-6">
          <CandidateAvatar fullName={candidate.fullName} size="lg" />

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              {candidate.fullName}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <MapPinIcon className={ICON} />
                {candidate.currentLocation ?? 'Location not shared'}
              </span>
              {candidate.jobTypes.length > 0 && (
                <span>
                  Open to {candidate.jobTypes.map((type) => JOB_TYPE_LABELS[type]).join(' · ')}
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-fg-subtle">
              {candidate.preferredLocations.length > 0
                ? `Would work in ${candidate.preferredLocations.join(', ')}`
                : 'No preferred locations listed'}
            </p>
          </div>

          {candidate.resumeFileId === undefined ? (
            <p className="text-sm text-fg-subtle">No résumé uploaded</p>
          ) : (
            <ResumeButton
              fileId={candidate.resumeFileId}
              candidateName={candidate.fullName}
              size="md"
            />
          )}
        </div>

        <div className="border-t border-border px-6 py-4">
          <h2 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Skills</h2>

          {candidate.skills.length === 0 ? (
            <p className="mt-2 text-sm text-fg-subtle">No skills listed.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {candidate.skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full bg-surface-inset px-2.5 py-1 text-xs font-medium text-fg-muted"
                >
                  {skill}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <CandidateSection
        icon={<BriefcaseIcon className={ICON} />}
        title="Work experience"
        items={candidate.experience}
        emptyText="No work experience listed."
        present={experienceConfig.present}
      />

      <CandidateSection
        icon={<GraduationCapIcon className={ICON} />}
        title="Education"
        items={candidate.education}
        emptyText="No education listed."
        present={educationConfig.present}
      />

      <CandidateSection
        icon={<SparkIcon className={ICON} />}
        title="Projects"
        items={candidate.projects}
        emptyText="No projects listed."
        present={projectConfig.present}
      />

      <CandidateSection
        icon={<AwardIcon className={ICON} />}
        title="Certifications"
        items={candidate.certifications}
        emptyText="No certifications listed."
        present={certificationConfig.present}
      />
    </div>
  );
};
