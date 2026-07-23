import { InternalError } from '../errors/app-error';
import type { EmailMessage, IEmailSender } from './email.types';

export interface ResendSenderConfig {
  readonly apiKey: string;
  readonly fromEmail: string;
  readonly fromName: string;
}

/** Injected so the adapter can be exercised without a network (CLAUDE.md §4, Adapter). */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

const ENDPOINT = 'https://api.resend.com/emails';

/**
 * Adapter over Resend's REST API. Wrapped rather than used directly so the provider can
 * be swapped, and so a failure comes back as this application's error type.
 *
 * `from` is always the verified sender: a message claiming to come from the recruiter's
 * own domain would fail SPF and land in spam. The recruiter's name goes in front of the
 * address and their real inbox goes in `reply_to`, which is what an applicant replies to.
 */
export class ResendEmailSender implements IEmailSender {
  constructor(
    private readonly config: ResendSenderConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await this.fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.formatFrom(message.fromName),
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.replyTo !== undefined ? { reply_to: message.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      // The body carries Resend's reason; it is for our logs, never for a client.
      const detail = await response.text().catch(() => '');
      throw new InternalError(
        `Resend rejected the message (${String(response.status)}): ${detail.slice(0, 200)}`,
      );
    }
  }

  /** `Grace Hopper (via Hire Me) <no-reply@example.com>` */
  private formatFrom(senderName: string | undefined): string {
    const label = senderName === undefined ? this.config.fromName : `${senderName} (via ${this.config.fromName})`;

    // A quote inside the display name would break the header.
    return `${label.replace(/["<>]/g, '')} <${this.config.fromEmail}>`;
  }
}
