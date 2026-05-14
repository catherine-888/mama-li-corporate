import 'server-only';
import { Resend } from 'resend';

// ─────────────────────────────────────────────────────────────
//  Email service. Wraps Resend with a no-op fallback so the app
//  builds and runs without a real API key (mock mode, local dev,
//  preview deployments).
// ─────────────────────────────────────────────────────────────

const key = process.env.RESEND_API_KEY;
const hasRealKey = !!key && !key.includes('mock');

// Minimal interface — only the methods we actually use.
type EmailClient = {
  emails: {
    send: (payload: {
      from: string;
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
      reply_to?: string;
    }) => Promise<unknown>;
  };
};

// Construct a real Resend client only when we have a real key.
// Otherwise expose a stub that no-ops and logs — keeps every
// caller's code path identical.
export const resend: EmailClient = hasRealKey
  ? (new Resend(key) as unknown as EmailClient)
  : {
      emails: {
        send: async (payload) => {
          console.log(
            '[email:mock] Would send:',
            payload.subject,
            'to',
            payload.to
          );
          return { id: 'mock-email-id' };
        },
      },
    };

export const FROM_ADDRESS =
  process.env.ORDERS_FROM_EMAIL && process.env.ORDERS_FROM_NAME
    ? `${process.env.ORDERS_FROM_NAME} <${process.env.ORDERS_FROM_EMAIL}>`
    : process.env.ORDERS_FROM_EMAIL ?? 'Mama Li <orders@mamali.co.uk>';

export const INBOX_ADDRESS =
  process.env.ORDERS_INBOX_EMAIL ?? 'orders@mamali.co.uk';
