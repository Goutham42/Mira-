import 'server-only';
import { clientEnv } from '@/config/env';
import { formatMoney } from '@/lib/money';

import { absoluteUrl } from './client';

/**
 * Transactional email bodies.
 *
 * Plain tables and inline styles, because email clients strip <style> blocks
 * and have no flexbox. Every template returns a text part too: some clients
 * refuse to render HTML, and a text alternative measurably helps deliverability.
 */

const STORE = clientEnv.NEXT_PUBLIC_STORE_NAME;

/** Values interpolated into HTML are user-controlled; escape them. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#faf7f2;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2b2724">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px">
    <tr><td style="padding:32px">
      <p style="margin:0 0 24px;font-size:18px;font-weight:600;letter-spacing:0.02em">${escapeHtml(STORE)}</p>
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600">${escapeHtml(heading)}</h1>
      ${bodyHtml}
    </td></tr>
  </table>
  <p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#8a8179;text-align:center">
    ${escapeHtml(STORE)} — this is an automated message, please do not reply.
  </p>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:0 0 24px">
    <a href="${href}" style="display:inline-block;padding:12px 20px;background:#2b2724;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px">${escapeHtml(label)}</a>
  </p>`;
}

export function verifyEmailTemplate(token: string) {
  const url = absoluteUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  return {
    subject: `Confirm your email address`,
    html: layout(
      'Confirm your email address',
      `<p style="margin:0 0 24px;font-size:14px;line-height:1.6">Welcome to ${escapeHtml(STORE)}. Confirm this address to finish setting up your account.</p>
       ${button(url, 'Confirm email')}
       <p style="margin:0;font-size:12px;color:#8a8179;line-height:1.6">This link expires in 30 minutes. If you did not create an account, ignore this email.</p>`,
    ),
    text: `Welcome to ${STORE}.\n\nConfirm your email address:\n${url}\n\nThis link expires in 30 minutes. If you did not create an account, ignore this email.`,
  };
}

export function passwordResetTemplate(token: string) {
  const url = absoluteUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  return {
    subject: `Reset your password`,
    html: layout(
      'Reset your password',
      `<p style="margin:0 0 24px;font-size:14px;line-height:1.6">We received a request to reset the password on your ${escapeHtml(STORE)} account.</p>
       ${button(url, 'Choose a new password')}
       <p style="margin:0;font-size:12px;color:#8a8179;line-height:1.6">This link expires in 30 minutes and can be used once. If you did not request this, no action is needed — your password has not changed.</p>`,
    ),
    text: `Reset your ${STORE} password:\n${url}\n\nThis link expires in 30 minutes and can be used once. If you did not request this, your password has not changed.`,
  };
}

export type OrderConfirmationInput = {
  orderNumber: string;
  currency: string;
  grandTotal: number;
  settlesOffline: boolean;
  lines: { title: string; quantity: number; lineTotal: number }[];
};

export function orderConfirmationTemplate(order: OrderConfirmationInput) {
  const url = absoluteUrl(`/checkout/confirmation/${encodeURIComponent(order.orderNumber)}`);

  const rows = order.lines
    .map(
      (line) =>
        `<tr>
           <td style="padding:8px 0;font-size:14px">${escapeHtml(line.title)} &times; ${line.quantity}</td>
           <td style="padding:8px 0;font-size:14px;text-align:right">${formatMoney(line.lineTotal, order.currency)}</td>
         </tr>`,
    )
    .join('');

  // The manual provider settles offline, so the shopper must be told the order
  // is not paid yet — otherwise "order confirmed" reads as "payment taken".
  const payNote = order.settlesOffline
    ? `<p style="margin:0 0 24px;font-size:14px;line-height:1.6">Your order is reserved and awaiting payment. We will confirm as soon as payment is received.</p>`
    : `<p style="margin:0 0 24px;font-size:14px;line-height:1.6">We have received your payment and will let you know when your order ships.</p>`;

  return {
    subject: `Order ${order.orderNumber} confirmed`,
    html: layout(
      `Thank you for your order`,
      `<p style="margin:0 0 8px;font-size:14px;line-height:1.6">Order <strong>${escapeHtml(order.orderNumber)}</strong></p>
       ${payNote}
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ece5db;margin-bottom:16px">
         ${rows}
         <tr>
           <td style="padding:12px 0 0;font-size:14px;font-weight:600;border-top:1px solid #ece5db">Total</td>
           <td style="padding:12px 0 0;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #ece5db">${formatMoney(order.grandTotal, order.currency)}</td>
         </tr>
       </table>
       ${button(url, 'View your order')}`,
    ),
    text: [
      `Thank you for your order.`,
      ``,
      `Order ${order.orderNumber}`,
      order.settlesOffline
        ? `Your order is reserved and awaiting payment.`
        : `We have received your payment.`,
      ``,
      ...order.lines.map(
        (line) => `${line.title} x ${line.quantity}  ${formatMoney(line.lineTotal, order.currency)}`,
      ),
      `Total: ${formatMoney(order.grandTotal, order.currency)}`,
      ``,
      `View your order: ${url}`,
    ].join('\n'),
  };
}
