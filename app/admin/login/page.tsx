'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { isMockMode, MOCK_KEYS, MOCK_USER } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  Admin login — magic link sent only to addresses already in
//  the admin_users table. The check happens server-side via
//  /api/admin/login so we don't leak whether an email is or
//  isn't an admin.
// ─────────────────────────────────────────────────────────────

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const errParam = params.get('error');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState(
    errParam === 'not_admin'
      ? "That email isn't on the admin list."
      : errParam === 'lookup_failed'
        ? 'Could not verify access. Try again or contact the site owner.'
        : ''
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setErrorMsg('Please enter a valid email.');
      setStatus('error');
      return;
    }
    setStatus('sending');
    setErrorMsg('');

    if (isMockMode()) {
      try {
        localStorage.setItem(MOCK_KEYS.user, JSON.stringify({ ...MOCK_USER, email }));
      } catch {
        /* ignore */
      }
      setTimeout(() => router.push('/admin'), 600);
      return;
    }

    try {
      // Server-side membership check + magic-link send in one go.
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Sign-in failed.');
      }
      setStatus('sent');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}
      className="login-grid"
    >
      <div
        style={{
          background: '#1c1813',
          color: '#f5eedc',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        className="login-aside"
      >
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontStyle: 'italic', fontSize: 26 }}>
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
        <div>
          <h1
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 56,
              lineHeight: 0.95,
              letterSpacing: '-0.025em',
              margin: 0,
            }}
          >
            Back of the<br />house.
          </h1>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14.5,
              lineHeight: 1.6,
              opacity: 0.7,
              maxWidth: 360,
              marginTop: 22,
            }}
          >
            Manage menu, delivery slots, site settings and incoming orders.
            Access is restricted to verified team members.
          </p>
        </div>
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.55,
          }}
        >
          orders@mamali.co.uk
        </div>
      </div>
      <div
        style={{
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#fafaf7',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 400,
              fontSize: 30,
              letterSpacing: '-0.02em',
              margin: 0,
              color: '#1c1813',
            }}
          >
            {status === 'sent' ? 'Check your inbox.' : 'Sign in.'}
          </h2>
          {status === 'sent' ? (
            <p style={{ marginTop: 14, fontSize: 14.5, color: '#5a524a', lineHeight: 1.6 }}>
              We&apos;ve sent a sign-in link to <strong style={{ color: '#1c1813' }}>{email}</strong>. The
              link is valid for one hour.
            </p>
          ) : (
            <form onSubmit={submit} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#5a524a',
                }}
              >
                Admin email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@mamali.co.uk"
                style={{
                  background: '#ffffff',
                  border: '1px solid #d9cfb6',
                  padding: '12px 14px',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  borderRadius: 4,
                  color: '#1c1813',
                  outline: 'none',
                }}
              />
              {errorMsg && (
                <div style={{ fontSize: 13, color: '#b43e2e' }}>{errorMsg}</div>
              )}
              <button
                type="submit"
                disabled={status === 'sending'}
                style={{
                  background: '#1c1813',
                  color: '#fafaf7',
                  border: 'none',
                  padding: '12px 16px',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 4,
                  cursor: 'pointer',
                  marginTop: 6,
                }}
              >
                {status === 'sending' ? 'Sending…' : 'Email me a sign-in link →'}
              </button>
            </form>
          )}
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          .login-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .login-aside {
            min-height: 320px;
          }
        }
      `}</style>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
