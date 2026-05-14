'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AdminUser } from '@/lib/admin-auth';
import { createClient } from '@/lib/supabase-browser';
import { isMockMode, MOCK_KEYS } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  Admin chrome — sidebar + header. Visible on every /admin/*
//  page except /admin/login (which renders without chrome).
// ─────────────────────────────────────────────────────────────

const NAV = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/calendar', label: 'Calendar' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/applications', label: 'Applications' },
  { href: '/admin/insights', label: 'Insights' },
  { href: '/admin/menu', label: 'Menu' },
  { href: '/admin/delivery', label: 'Delivery' },
  { href: '/admin/settings', label: 'Site settings' },
];

export default function AdminChrome({
  admin,
  children,
}: {
  admin: AdminUser | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Login page renders without chrome.
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const signOut = async () => {
    if (isMockMode()) {
      try {
        localStorage.removeItem(MOCK_KEYS.user);
      } catch {
        /* ignore */
      }
      router.push('/admin/login');
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '240px minmax(0, 1fr)',
        fontFamily: 'DM Sans, system-ui, sans-serif',
        color: '#1c1813',
        background: '#fafaf7',
      }}
      className="admin-shell"
    >
      <aside
        style={{
          background: '#1c1813',
          color: '#f5eedc',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
        className="admin-sidebar"
      >
        <Link href="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span
              style={{
                fontFamily: 'Newsreader, serif',
                fontWeight: 500,
                fontStyle: 'italic',
                fontSize: 22,
                letterSpacing: '-0.01em',
              }}
            >
              Mama Li
            </span>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                opacity: 0.6,
                marginTop: 4,
              }}
            >
              Admin
            </span>
          </div>
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  display: 'block',
                  padding: '10px 14px',
                  borderRadius: 4,
                  fontSize: 14,
                  textDecoration: 'none',
                  color: active ? '#f5eedc' : 'rgba(245,238,220,0.65)',
                  background: active ? 'rgba(245,238,220,0.08)' : 'transparent',
                  transition: 'background 120ms',
                }}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {admin && (
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                opacity: 0.55,
                lineHeight: 1.6,
              }}
            >
              Signed in as
              <div style={{ color: '#f5eedc', fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>
                {admin.email}
              </div>
            </div>
          )}
          <button
            onClick={signOut}
            style={{
              background: 'transparent',
              color: 'rgba(245,238,220,0.8)',
              border: '1px solid rgba(245,238,220,0.2)',
              padding: '8px 12px',
              fontSize: 12,
              fontFamily: 'inherit',
              borderRadius: 4,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Sign out
          </button>
          <Link
            href="/"
            target="_blank"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(245,238,220,0.55)',
              textDecoration: 'none',
            }}
          >
            View live site ↗
          </Link>
        </div>
      </aside>

      <main style={{ padding: '32px 40px', minWidth: 0 }} className="admin-main">
        {children}
      </main>

      <style jsx global>{`
        @media (max-width: 768px) {
          .admin-shell {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .admin-sidebar {
            position: relative !important;
            height: auto !important;
          }
          .admin-main {
            padding: 24px 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
