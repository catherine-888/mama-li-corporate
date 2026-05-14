import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  POST /api/admin/login
//
//  Checks the email is in the admin_users table, then sends a
//  magic-link. Returns a generic success message either way to
//  avoid revealing admin emails to outside callers — Supabase
//  returns the same response if the user doesn't exist with
//  shouldCreateUser=false.
// ─────────────────────────────────────────────────────────────

const Schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  if (isMockMode()) {
    return NextResponse.json({ ok: true, mocked: true });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email.' }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  // Membership check (via service role to bypass RLS)
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('admin_users')
    .select('user_id')
    .eq('email', email)
    .maybeSingle();

  // Send magic-link only if email is in admin_users. If not, we
  // still return 200 to avoid revealing membership.
  if (row) {
    const supabase = createClient();
    const url = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${url}/api/auth/callback?next=/admin`,
        shouldCreateUser: false,
      },
    });
  }
  return NextResponse.json({ ok: true });
}
