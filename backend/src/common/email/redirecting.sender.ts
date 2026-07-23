import type { EmailMessage, IEmailSender } from './email.types';

/**
 * Decorator that sends every message to one address instead of its real recipient.
 *
 * For the case where there is no verified sending domain yet: a provider will only accept
 * mail to the account's own address, so this makes a campaign genuinely testable — real
 * messages arrive in a real inbox — without a single candidate being contacted. The
 * intended recipient is carried in the subject and a banner, so the redirect can never be
 * mistaken for the real thing.
 */
export class RedirectingEmailSender implements IEmailSender {
  constructor(
    private readonly inner: IEmailSender,
    private readonly redirectTo: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    await this.inner.send({
      ...message,
      to: this.redirectTo,
      subject: `[to: ${message.to}] ${message.subject}`,
      text: [
        `This is a redirected test message. It was addressed to ${message.to}.`,
        'Set MAIL_REDIRECT_TO empty to deliver to real recipients.',
        '',
        '---',
        '',
        message.text,
      ].join('\n'),
    });
  }
}
