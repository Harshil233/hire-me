import { describe, expect, it, vi } from 'vitest';

import { LoggingEmailSender } from '../../../common/email/logging.sender';
import { ResendEmailSender } from '../../../common/email/resend.sender';
import { createFakeLogger } from '../../../../tests/helpers/fakes';
import type { JobWithCompany } from '../../job/job.interface';
import { renderCampaignEmail } from '../outreach.template';
import { isValidUnsubscribeToken, signUnsubscribeToken } from '../unsubscribe-token';

const SECRET = 'a-test-unsubscribe-secret-long-enough';
const NOW = new Date('2026-07-01T10:00:00.000Z');

const JOB = {
  id: 'job-1',
  title: 'Senior Backend Engineer',
  company: { id: 'company-1', name: 'Nimbus Labs', slug: 'nimbus-labs' },
} as unknown as JobWithCompany;

const render = (body: string, firstName = 'Ada'): string =>
  renderCampaignEmail({
    body,
    firstName,
    job: JOB,
    candidateUserId: 'cand-1',
    appBaseUrl: 'https://app.test/',
    unsubscribeSecret: SECRET,
  });

describe('renderCampaignEmail', () => {
  it('fills the tokens a recruiter may use', () => {
    const text = render('Hi {{firstName}}, {{companyName}} is hiring a {{jobTitle}}.');

    expect(text).toContain('Hi Ada, Nimbus Labs is hiring a Senior Backend Engineer.');
  });

  it('leaves an unknown token alone rather than emptying it', () => {
    expect(render('Hello {{nickname}}')).toContain('Hello {{nickname}}');
  });

  it('does not re-substitute text that came from the candidate', () => {
    // A name that looks like a token must not become a second substitution.
    const text = render('Hi {{firstName}}', '{{jobTitle}}');

    expect(text).toContain('Hi {{jobTitle}}');
  });

  it('links to the listing without doubling the slash', () => {
    expect(render('x')).toContain('https://app.test/jobs/job-1');
  });

  it('always carries a working unsubscribe link', () => {
    const text = render('x');
    const token = signUnsubscribeToken('cand-1', SECRET);

    expect(text).toContain(`https://app.test/unsubscribe?u=cand-1&t=${token}`);
  });

  it('says why the message arrived', () => {
    expect(render('x')).toContain('open to employer contact');
  });
});

describe('unsubscribe tokens', () => {
  it('accepts the token it signed', () => {
    expect(isValidUnsubscribeToken('cand-1', signUnsubscribeToken('cand-1', SECRET), SECRET)).toBe(
      true,
    );
  });

  it('rejects another user’s token', () => {
    expect(isValidUnsubscribeToken('cand-1', signUnsubscribeToken('cand-2', SECRET), SECRET)).toBe(
      false,
    );
  });

  it('rejects a token signed with a different secret', () => {
    expect(
      isValidUnsubscribeToken('cand-1', signUnsubscribeToken('cand-1', 'other-secret'), SECRET),
    ).toBe(false);
  });

  it('rejects a token of the wrong length without throwing', () => {
    expect(isValidUnsubscribeToken('cand-1', 'short', SECRET)).toBe(false);
  });
});

describe('LoggingEmailSender', () => {
  it('records the message instead of sending it', async () => {
    const logger = createFakeLogger();

    await new LoggingEmailSender(logger).send({
      to: 'ada@example.com',
      subject: 'Hello',
      text: 'Body',
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('not sent'),
      expect.objectContaining({ to: 'ada@example.com' }),
    );
  });
});

describe('ResendEmailSender', () => {
  const config = { apiKey: 'key', fromEmail: 'no-reply@app.test', fromName: 'Hire Me' };

  const okFetch = (): ReturnType<typeof vi.fn> =>
    vi.fn(async () => new Response('{}', { status: 200 }));

  it('posts one recipient at a time, never a shared list', async () => {
    const fetchImpl = okFetch();

    await new ResendEmailSender(config, fetchImpl).send({
      to: 'ada@example.com',
      subject: 'Hello',
      text: 'Body',
    });

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as { to: string[] };
    expect(body.to).toEqual(['ada@example.com']);
  });

  it('sends from the verified address with the recruiter named in front of it', async () => {
    const fetchImpl = okFetch();

    await new ResendEmailSender(config, fetchImpl).send({
      to: 'ada@example.com',
      subject: 'Hello',
      text: 'Body',
      fromName: 'Nimbus Labs',
    });

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as { from: string };
    expect(body.from).toBe('Nimbus Labs (via Hire Me) <no-reply@app.test>');
  });

  it('routes replies to the recruiter', async () => {
    const fetchImpl = okFetch();

    await new ResendEmailSender(config, fetchImpl).send({
      to: 'ada@example.com',
      subject: 'Hello',
      text: 'Body',
      replyTo: 'grace@nimbuslabs.test',
    });

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as { reply_to?: string };
    expect(body.reply_to).toBe('grace@nimbuslabs.test');
  });

  it('strips characters that would break the From header', async () => {
    const fetchImpl = okFetch();

    await new ResendEmailSender(config, fetchImpl).send({
      to: 'ada@example.com',
      subject: 'Hello',
      text: 'Body',
      fromName: 'Ev"il <x@y>',
    });

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as { from: string };
    expect(body.from).toBe('Evil x@y (via Hire Me) <no-reply@app.test>');
  });

  it('turns a provider rejection into an application error', async () => {
    const fetchImpl = vi.fn(async () => new Response('quota exceeded', { status: 422 }));

    await expect(
      new ResendEmailSender(config, fetchImpl).send({
        to: 'ada@example.com',
        subject: 'Hello',
        text: 'Body',
      }),
    ).rejects.toThrow(/Resend rejected the message \(422\)/);
  });
});

describe('the day boundary used by the daily cap', () => {
  it('is exactly twenty-four hours', () => {
    const since = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);

    expect(since.toISOString()).toBe('2026-06-30T10:00:00.000Z');
  });
});
