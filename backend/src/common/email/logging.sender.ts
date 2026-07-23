import type { ILogger } from '../types/logger';
import type { EmailMessage, IEmailSender } from './email.types';

/**
 * Writes the whole message to the log instead of sending it.
 *
 * The default driver, so the app runs without an API key and nobody accidentally mails a
 * real candidate from a laptop. It logs the full body rather than a preview on purpose:
 * without a verified sending domain this is the only way to read what a campaign would
 * actually have said, including the personalisation and the unsubscribe link.
 */
export class LoggingEmailSender implements IEmailSender {
  constructor(private readonly logger: ILogger) {}

  async send(message: EmailMessage): Promise<void> {
    this.logger.info('Outreach email (not sent — MAIL_DRIVER is "log")', {
      to: message.to,
      from: message.fromName,
      replyTo: message.replyTo,
      subject: message.subject,
      body: message.text,
    });

    return Promise.resolve();
  }
}
