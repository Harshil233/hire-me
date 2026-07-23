import { Link } from 'react-router-dom';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ROUTES } from '@/config/constants';

export interface CampaignSentModalProps {
  readonly isOpen: boolean;
  /** How many candidates the campaign was queued for, echoed back from the server. */
  readonly recipientCount: number;
  readonly onClose: () => void;
}

/**
 * The confirmation a recruiter sees the moment a campaign is accepted. Sending itself
 * runs on a worker, so this says the messages are on their way and points at the
 * Campaigns section, where the live delivery counts are shown.
 */
export const CampaignSentModal = ({
  isOpen,
  recipientCount,
  onClose,
}: CampaignSentModalProps): React.JSX.Element => {
  const people = recipientCount === 1 ? 'candidate' : 'candidates';

  return (
    <Modal
      isOpen={isOpen}
      title="Email sent"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
          <Link to={ROUTES.OUTREACH}>
            <Button>View campaigns</Button>
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-fg">
          Your message is on its way to {recipientCount} {people}. Each person gets their
          own copy with an unsubscribe link, and replies come to your inbox.
        </p>
        <p className="text-sm text-fg-muted">
          Check the Campaigns section for delivery details — who received it, who opted
          out, and anything that bounced.
        </p>
      </div>
    </Modal>
  );
};
