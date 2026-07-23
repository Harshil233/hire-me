import { useState } from 'react';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { Modal } from '@/components/Modal';
import { Select } from '@/components/Select';
import { TextArea, TextInput } from '@/components/TextInput';
import type { Job } from '@/features/jobs/schemas/job.schema';
import type { ApiError } from '@/services/api-error';
import { useAudiencePreview } from '../hooks/useOutreach';
import { MERGE_TOKENS, type CampaignAudience, type CampaignDraft } from '../schemas/outreach.schema';

export interface ComposeCampaignModalProps {
  readonly isOpen: boolean;
  readonly audience: CampaignAudience;
  /** Only a published listing can be advertised, so the caller filters before passing. */
  readonly jobs: readonly Job[];
  readonly isSending: boolean;
  readonly error: ApiError | null;
  readonly onClose: () => void;
  readonly onSend: (draft: CampaignDraft) => void;
}

const defaultBody = (job: Job | undefined): string =>
  [
    'Hi {{firstName}},',
    '',
    `I came across your profile and thought you might be a fit for our ${job?.title ?? '{{jobTitle}}'} role at {{companyName}}.`,
    '',
    'If it looks interesting, the full description is linked below and you can apply from there. Happy to answer anything.',
    '',
    'Best regards',
  ].join('\n');

/**
 * Writing one message that goes to many people, one at a time.
 *
 * The reach is counted by the server before anything is sent, because "select all
 * matching" is a filter rather than a list and a recruiter should see how many people
 * that turned out to be before they commit to it.
 */
export const ComposeCampaignModal = ({
  isOpen,
  audience,
  jobs,
  isSending,
  error,
  onClose,
  onSend,
}: ComposeCampaignModalProps): React.JSX.Element => {
  const [jobId, setJobId] = useState(jobs[0]?.id ?? '');
  const selectedJob = jobs.find((job) => job.id === jobId);

  const [subject, setSubject] = useState(
    selectedJob === undefined ? '' : `${selectedJob.title} at {{companyName}}`,
  );
  const [body, setBody] = useState(defaultBody(selectedJob));

  const draft: CampaignDraft = { jobId, subject, body, audience };
  const preview = useAudiencePreview(jobId === '' ? null : draft);

  const canSend = jobId !== '' && subject.trim() !== '' && body.trim() !== '';

  return (
    <Modal isOpen={isOpen} title="Email these candidates" onClose={onClose}>
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <Alert tone="warning">
            Publish a job first. Every campaign invites candidates to one of your live
            listings, so there is nothing to invite them to yet.
          </Alert>
        ) : (
          <>
            <FormField label="Invite them to" hint="Only your published listings">
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={jobId}
                  options={jobs.map((job) => ({ value: job.id, label: job.title }))}
                  onChange={(event) => {
                    const next = jobs.find((job) => job.id === event.target.value);
                    setJobId(event.target.value);
                    if (next !== undefined) {
                      setSubject(`${next.title} at {{companyName}}`);
                      setBody(defaultBody(next));
                    }
                  }}
                />
              )}
            </FormField>

            <FormField label="Subject">
              {(fieldProps) => (
                <TextInput
                  {...fieldProps}
                  value={subject}
                  onChange={(event) => {
                    setSubject(event.target.value);
                  }}
                />
              )}
            </FormField>

            <FormField label="Message" hint={`Use ${MERGE_TOKENS.map((t) => `{{${t}}}`).join(', ')}`}>
              {(fieldProps) => (
                <TextArea
                  {...fieldProps}
                  rows={10}
                  value={body}
                  onChange={(event) => {
                    setBody(event.target.value);
                  }}
                />
              )}
            </FormField>

            <p className="text-sm text-fg-muted">
              Each person gets their own message — nobody sees who else was contacted. The
              listing and an unsubscribe link are added automatically, and replies come to
              your inbox.
            </p>

            {error !== null && <Alert tone="error">{error.message}</Alert>}
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <span className="text-sm text-fg-muted" data-testid="audience-count">
            {preview.isSuccess
              ? `${String(preview.data)} ${preview.data === 1 ? 'person' : 'people'} will be emailed`
              : 'Counting who can be reached…'}
          </span>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              isLoading={isSending}
              disabled={!canSend || preview.data === 0}
              onClick={() => {
                onSend(draft);
              }}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
