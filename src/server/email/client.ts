import 'server-only';
import { Resend } from 'resend';

import { env } from '@/config/env';
import { logger } from '@/lib/logger';

/**
 * Transactional email transport.
 *
 * Two deliberate properties:
 *
 * 1. **Optional in development.** With no `RESEND_API_KEY` the message is
 *    logged instead of sent, so the signup and reset flows stay testable
 *    end to end without an account or a verified domain.
 * 2. **Never throws.** A bounced confirmation must not roll back a paid
 *    order or a successful registration. Failures are logged and reported
 *    through the return value; callers decide whether they care.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | { delivered: true; id: string | null }
  | { delivered: false; reason: 'not-configured' | 'failed' };

// Instantiated lazily so importing this module never fails at build time.
let client: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  client ??= new Resend(env.RESEND_API_KEY);
  return client;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getClient();

  if (!resend) {
    // Logged under `email` so the logger's existing redaction path covers the
    // recipient. The body carries the actionable part (verification and reset
    // links) so the flow can still be completed by hand in development.
    logger.warn(
      { email: input.to, subject: input.subject, body: input.text },
      'RESEND_API_KEY not set — email logged instead of sent',
    );
    return { delivered: false, reason: 'not-configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
    });

    if (error) {
      // Resend reports delivery problems in the body rather than by throwing.
      logger.error({ err: error, subject: input.subject }, 'Email send rejected');
      return { delivered: false, reason: 'failed' };
    }

    logger.info({ subject: input.subject, id: data?.id }, 'Email sent');
    return { delivered: true, id: data?.id ?? null };
  } catch (error) {
    logger.error({ err: error, subject: input.subject }, 'Email transport threw');
    return { delivered: false, reason: 'failed' };
  }
}

/** Absolute URL for links in email; relative paths are useless in an inbox. */
export function absoluteUrl(path: string): string {
  return new URL(path, env.APP_URL).toString();
}
