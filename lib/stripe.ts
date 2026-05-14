import 'server-only';
import Stripe from 'stripe';

// ─────────────────────────────────────────────────────────────
//  Stripe client. Same approach as lib/email.ts — real client
//  when a real key is present, no-op stub otherwise. Means the
//  app builds and runs without Stripe credentials (mock mode,
//  preview deployments).
// ─────────────────────────────────────────────────────────────

const key = process.env.STRIPE_SECRET_KEY;
const hasRealKey = !!key && !key.includes('mock');

type StripeClient = {
  checkout: {
    sessions: {
      create: (args: unknown) => Promise<{ id: string; url: string | null }>;
      retrieve: (id: string, args?: unknown) => Promise<unknown>;
    };
  };
  webhooks: {
    constructEvent: (
      payload: string | Buffer,
      header: string | Buffer | string[],
      secret: string
    ) => unknown;
  };
};

export const stripe: StripeClient = hasRealKey
  ? (new Stripe(key, { apiVersion: '2024-09-30.acacia' }) as unknown as StripeClient)
  : {
      checkout: {
        sessions: {
          create: async () => {
            console.log('[stripe:mock] checkout.sessions.create called');
            return {
              id: 'cs_mock_' + Math.random().toString(36).slice(2),
              url: '/confirmation?mock=1',
            };
          },
          retrieve: async () => {
            console.log('[stripe:mock] checkout.sessions.retrieve called');
            return { id: 'cs_mock', payment_status: 'paid', status: 'complete' };
          },
        },
      },
      webhooks: {
        constructEvent: () => {
          throw new Error('Stripe webhooks are not available in mock mode.');
        },
      },
    };

export const isStripeLive = hasRealKey;
