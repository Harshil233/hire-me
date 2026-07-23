import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/format';
import type { Campaign } from '../schemas/outreach.schema';

const STATUS_LABELS: Record<Campaign['status'], string> = {
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
};

const STATUS_CLASSES: Record<Campaign['status'], string> = {
  queued: 'bg-surface-inset text-fg-muted',
  sending: 'bg-tone-permanent-soft text-tone-permanent',
  sent: 'bg-success-soft text-success',
  failed: 'bg-danger-soft text-danger',
};

export interface CampaignRowProps {
  readonly campaign: Campaign;
}

/**
 * One campaign and how it went. Skipped is shown separately from failed, because they
 * mean different things: somebody opted out, versus the provider refused the message.
 */
export const CampaignRow = ({ campaign }: CampaignRowProps): React.JSX.Element => (
  <article className="surface-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-fg">{campaign.subject}</h2>
        <p className="mt-1 text-sm text-fg-subtle">Sent {formatRelativeTime(campaign.createdAt)}</p>
      </div>

      <span
        className={cn(
          'rounded-full px-2.5 py-1 text-xs font-medium',
          STATUS_CLASSES[campaign.status],
        )}
      >
        {STATUS_LABELS[campaign.status]}
      </span>
    </div>

    <p className="mt-3 line-clamp-2 text-sm whitespace-pre-line text-fg-muted">{campaign.body}</p>

    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3 text-sm">
      <div className="flex items-baseline gap-1.5">
        <dt className="text-fg-subtle">Recipients</dt>
        <dd className="numeric font-medium text-fg">{campaign.recipientCount}</dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt className="text-fg-subtle">Delivered</dt>
        <dd className="numeric font-medium text-success">{campaign.sentCount}</dd>
      </div>
      {campaign.skippedCount > 0 && (
        <div className="flex items-baseline gap-1.5">
          <dt className="text-fg-subtle">Opted out</dt>
          <dd className="numeric font-medium text-fg-muted">{campaign.skippedCount}</dd>
        </div>
      )}
      {campaign.failedCount > 0 && (
        <div className="flex items-baseline gap-1.5">
          <dt className="text-fg-subtle">Failed</dt>
          <dd className="numeric font-medium text-danger">{campaign.failedCount}</dd>
        </div>
      )}
    </dl>
  </article>
);
