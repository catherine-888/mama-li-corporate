import 'server-only';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from './supabase-server';
import { isMockMode } from './mock';

// ─────────────────────────────────────────────────────────────
//  Admin auth helper. Used inside /admin pages and API routes
//  to ensure the caller is signed in AND has a row in
//  public.admin_users.
//
//  Call from a Server Component or Route Handler:
//
//    const admin = await requireAdmin();
//
//  Returns the admin row (user_id, email, name, role). On
//  failure, redirects to /admin/login.
//
//  Mock mode: returns a fake admin so the UI can be previewed
//  locally without setting anything up.
// ─────────────────────────────────────────────────────────────

export type AdminUser = {
  user_id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'owner';
};

export async function requireAdmin(): Promise<AdminUser> {
  if (isMockMode()) {
    return {
      user_id: 'mock-admin',
      email: 'demo@mamali.co.uk',
      name: 'Demo Admin',
      role: 'owner',
    };
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.email) {
    redirect('/admin/login');
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('admin_users')
    .select('user_id, email, name, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('admin_users lookup failed:', error);
    redirect('/admin/login?error=lookup_failed');
  }
  if (!row) {
    redirect('/admin/login?error=not_admin');
  }
  return row as AdminUser;
}

// Soft check — returns the admin row or null, doesn't redirect.
// Use when you want to render conditional UI without bouncing.
export async function getAdmin(): Promise<AdminUser | null> {
  if (isMockMode()) {
    return {
      user_id: 'mock-admin',
      email: 'demo@mamali.co.uk',
      name: 'Demo Admin',
      role: 'owner',
    };
  }
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.email) return null;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('admin_users')
    .select('user_id, email, name, role')
    .eq('user_id', user.id)
    .maybeSingle();
  return (row as AdminUser) ?? null;
}
