import { createToken, type Token } from '../../container/token';

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  /** Plain text; the adapter is responsible for any wrapping it needs. */
  readonly text: string;
  /** Where a reply goes — the recruiter, not the application. */
  readonly replyTo?: string | undefined;
  /** Shown as the sender's name in front of the verified address. */
  readonly fromName?: string | undefined;
}

/**
 * Port for sending one message. Deliberately singular: outreach sends a separate email
 * per recipient, because putting a list of candidates in one `To` would hand every one
 * of them the others' addresses.
 */
export interface IEmailSender {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_SENDER: Token<IEmailSender> = createToken('IEmailSender');
