// ─────────────────────────────────────────────────────────────
//  Mock mode — when NEXT_PUBLIC_MOCK_MODE=1, the site runs
//  without Supabase / Stripe / Resend. Useful for local
//  previews, design reviews, and demos.
//
//  The flag is read at module load. All external integrations
//  check `isMockMode()` and short-circuit with realistic fake
//  responses.
// ─────────────────────────────────────────────────────────────

export function isMockMode(): boolean {
  // Available on both server and client because of NEXT_PUBLIC_ prefix.
  return process.env.NEXT_PUBLIC_MOCK_MODE === '1';
}

// Fake "signed in" user used by the auth shim. Stored in
// localStorage on the client so a refresh keeps the user "signed in".
export const MOCK_USER = {
  id: 'mock-user-00000000',
  email: 'demo@mamali.co.uk',
};

// Storage keys for the client-side mock
export const MOCK_KEYS = {
  user: 'mamali.mock.user',
  // Last-pending mock order; reused by the confirmation page
  lastOrder: 'mamali.mock.lastOrder',
};
