import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ─────────────────────────────────────────────────────────────
//  Server-side Supabase client. Reads & writes the user's
//  session cookie so RSCs and API routes see the same auth state
//  as the browser.
// ─────────────────────────────────────────────────────────────

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — middleware will refresh.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Same as above.
          }
        },
      },
    }
  );
}

// Admin client — bypasses RLS. Use ONLY in server-side code that
// the user can't reach directly (webhooks, scheduled jobs).
import { createClient as createServiceClient } from '@supabase/supabase-js';
export function createAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
