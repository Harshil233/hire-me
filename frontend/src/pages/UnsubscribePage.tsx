import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { unsubscribeApi, type IUnsubscribeApi } from '@/features/outreach/api/outreach.api';
import { AuthLayout } from './AuthLayout';

type State = 'ready' | 'working' | 'done' | 'failed';

export interface UnsubscribePageProps {
  readonly api?: IUnsubscribeApi;
}

/**
 * Reached from a link in an email, by someone with no session and possibly no intention
 * of signing in. The click only opens this page; the change needs a press, because mail
 * scanners follow links and nobody should be unsubscribed by a security appliance.
 */
export const UnsubscribePage = ({
  api = unsubscribeApi,
}: UnsubscribePageProps): React.JSX.Element => {
  const [params] = useSearchParams();
  const [state, setState] = useState<State>('ready');

  const userId = params.get('u') ?? '';
  const token = params.get('t') ?? '';
  const isLinkComplete = userId !== '' && token !== '';

  return (
    <AuthLayout
      title="Stop these emails"
      subtitle="Employers will no longer be able to contact you through Hire Me."
    >
      {!isLinkComplete && (
        <Alert tone="error">
          This link is incomplete. Open it directly from the email you received.
        </Alert>
      )}

      {state === 'done' && (
        <Alert tone="success">
          Done. You will not receive any more employer emails. You can turn this back on
          from your profile whenever you like.
        </Alert>
      )}

      {state === 'failed' && (
        <Alert tone="error">
          That link is no longer valid. It may have expired or already been used.
        </Alert>
      )}

      {isLinkComplete && state !== 'done' && (
        <Button
          className="w-full"
          isLoading={state === 'working'}
          onClick={() => {
            setState('working');
            api
              .unsubscribe(userId, token)
              .then(() => {
                setState('done');
              })
              .catch(() => {
                setState('failed');
              });
          }}
        >
          Unsubscribe me
        </Button>
      )}
    </AuthLayout>
  );
};
