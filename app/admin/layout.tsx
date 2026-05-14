import type { ReactNode } from 'react';
import { getAdmin } from '@/lib/admin-auth';
import AdminChrome from './admin-chrome';

// ─────────────────────────────────────────────────────────────
//  Admin layout — applied to every /admin/* page.
//
//  The actual auth gate happens in each child page via
//  requireAdmin() (which redirects to /admin/login). This layout
//  just provides the chrome (sidebar + header).
//
//  Login page is special: it sits inside /admin but skips the
//  chrome (no sidebar). It detects this by checking the route.
// ─────────────────────────────────────────────────────────────

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Try to get the admin (won't redirect if absent — login page
  // is a public child). Pass to chrome for the email display.
  const admin = await getAdmin();
  return <AdminChrome admin={admin}>{children}</AdminChrome>;
}
