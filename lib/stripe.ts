import Stripe from 'stripe';

// ─────────────────────────────────────────────────────────────
//  Stripe SDK — server-only. Never import this from a client
//  component (the secret key would leak).
// ─────────────────────────────────────────────────────────────

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Pin to the version this SDK ships with. When upgrading the
  // `stripe` package, update this string to match.
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});
