import type { ILogger } from '../types/logger';
import type { EmailMessage, IEmailSender } from './email.types';

/**
 * Writes the message to the log instead of sending it. The default driver, so the app
 * runs without an API key and nobody accidentally mails a real candidate from a laptop.
 */
export class LoggingEmailSender implements IEmailSender {
  constructor(private readonly logger: ILogger) {}

  async send(message: EmailMessage): Promise<void> {
    this.logger.info('Email not sent — MAIL_DRIVER is "log"', {
      to: message.to,
      subject: message.subject,
      replyTo: message.replyTo,
      preview: message.text.slice(0, 200),
    });

    return Promise.resolve();
  }
}
