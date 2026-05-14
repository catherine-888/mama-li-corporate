import { Resend } from 'resend';

// ─────────────────────────────────────────────────────────────
//  Resend client — server-only. Used by the Stripe webhook to
//  send order confirmations after successful payment.
// ─────────────────────────────────────────────────────────────

export const resend = new Resend(process.env.RESEND_API_KEY!);

export const FROM_ADDRESS = `${process.env.ORDERS_FROM_NAME ?? 'Mama Li Corporate'} <${process.env.ORDERS_FROM_EMAIL ?? 'orders@mamali.co.uk'}>`;
export const OPS_INBOX = process.env.ORDERS_INBOX_EMAIL ?? 'orders@mamali.co.uk';
