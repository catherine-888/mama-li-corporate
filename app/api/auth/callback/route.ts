import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// ─────────────────────────────────────────────────────────────
//  GET /api/auth/callback?code=...&next=/menu
//  Supabase magic-link redirect. Exchanges the `code` for a
//  session cookie, then redirects to `next` (default /menu).
// ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }
  // Failure → bounce to auth with an error flag
  return NextResponse.redirect(new URL('/auth?error=callback_failed', request.url));
}
