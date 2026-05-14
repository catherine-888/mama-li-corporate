import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './supabase-server';
import { isMockMode, MOCK_USER } from './mock';

// ─────────────────────────────────────────────────────────────
//  Customer account auth — for /account pages. Less strict than
//  /admin (any signed-in user qualifies). Redirects to /auth on
//  failure.
// ─────────────────────────────────────────────────────────────

export type AccountUser = { id: string; email: string };

export async function requireCustomer(): Promise<AccountUser> {
  if (isMockMode()) {
    return { id: MOCK_USER.id, email: MOCK_USER.email };
  }
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) {
    redirect('/auth');
  }
  return { id: data.user.id, email: data.user.email };
}

export async function getCustomer(): Promise<AccountUser | null> {
  if (isMockMode()) {
    return { id: MOCK_USER.id, email: MOCK_USER.email };
  }
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return null;
  return { id: data.user.id, email: data.user.email };
}
