import { createBrowserClient } from '@supabase/ssr';

// ─────────────────────────────────────────────────────────────
//  Browser-side Supabase client. Used by client components for
//  auth (magic-link sign-in) and read-only queries.
//  Bound by row-level security — see supabase/schema.sql.
// ─────────────────────────────────────────────────────────────

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
