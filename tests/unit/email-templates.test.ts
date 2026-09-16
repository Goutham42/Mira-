import { describe, expect, it } from 'vitest';

import { sendEmail } from '@/server/email/client';
import {
  orderConfirmationTemplate,
  passwordResetTemplate,
  verifyEmailTemplate,
} from '@/server/email/templates';

describe('verifyEmailTemplate', () => {
  it('builds an absolute link carrying the token', () => {
    const { html, text } = verifyEmailTemplate('abc123');
    expect(text).toMatch(/https?:\/\/.+\/verify-email\?token=abc123/);
    expect(html).toContain('/verify-email?token=abc123');
  });

  it('url-encodes tokens containing reserved characters', () => {
    const { text } = verifyEmailTemplate('a+b/c=');
    expect(text).toContain('token=a%2Bb%2Fc%3D');
  });
});

describe('passwordResetTemplate', () => {
  it('links to the reset page and states the expiry', () => {
    const { html, text, subject } = passwordResetTemplate('tok');
    expect(subject).toBe('Reset your password');
    expect(html).toContain('/reset-password?token=tok');
    expect(text).toContain('30 minutes');
  });
});

describe('orderConfirmationTemplate', () => {
  const base = {
    orderNumber: 'MIRA-1042',
    currency: 'INR',
    grandTotal: 249900,
    lines: [{ title: 'Anaya Kurti', quantity: 2, lineTotal: 199900 }],
  };

  it('formats totals in the order currency', () => {
    const { html, text } = orderConfirmationTemplate({ ...base, settlesOffline: false });
    expect(html).toContain('2,499');
    expect(text).toContain('2,499');
  });

  it('says payment is outstanding when the provider settles offline', () => {
    const offline = orderConfirmationTemplate({ ...base, settlesOffline: true });
    const online = orderConfirmationTemplate({ ...base, settlesOffline: false });
    expect(offline.text).toContain('awaiting payment');
    expect(online.text).not.toContain('awaiting payment');
  });

  it('escapes product titles rather than interpolating raw HTML', () => {
    const { html } = orderConfirmationTemplate({
      ...base,
      settlesOffline: true,
      lines: [{ title: '<img src=x onerror=alert(1)>', quantity: 1, lineTotal: 100 }],
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });
});

describe('sendEmail without a configured key', () => {
  it('reports non-delivery instead of throwing', async () => {
    // The suite runs without RESEND_API_KEY, so this is the fallback path.
    const result = await sendEmail({
      to: 'shopper@example.com',
      subject: 's',
      html: '<p>h</p>',
      text: 't',
    });
    expect(result).toEqual({ delivered: false, reason: 'not-configured' });
  });
});
